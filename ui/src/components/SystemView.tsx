// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Icon, List, Segment, Divider } from 'semantic-ui-react';
import { Party } from '@daml/types';
import { userContext } from './App';
import { Initializer, Chain, TrustedAddress } from '@daml.js/asterizm-0.1.0';

const SystemView: React.FC = () => {
  const [factoryCid, setFactoryCid] = useState<string>('');
  const [systemRelayerOwner, setSystemRelayerOwner] = useState('');
  const [localChainId, setLocalChainId] = useState(1);
  const [systemFee, setSystemFee] = useState(0.1);
  const [isInitializing, setIsInitializing] = useState(false);

  const [chainId, setChainId] = useState(2);
  const [chainName, setChainName] = useState('Ethereum');
  const [chainType, setChainType] = useState(1);
  const [isCreatingChain, setIsCreatingChain] = useState(false);

  const [clientOwner, setClientOwner] = useState('');
  const [address, setAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [isAddingTrustedAddress, setIsAddingTrustedAddress] = useState(false);

  const ledger = userContext.useLedger();
  const currentParty = userContext.useParty();

  const factories = userContext.useStreamQueries(Initializer.Factory).contracts;
  const chains = userContext.useStreamQueries(Chain).contracts;
  const trustedAddresses = userContext.useStreamQueries(TrustedAddress).contracts;

  const createFactory = async () => {
    setIsInitializing(true);
    try {
      const cid = await ledger.create(Initializer.Factory, { manager: currentParty });
      setFactoryCid(cid.contractId);
    } catch (error) {
      alert(`Error creating factory: ${JSON.stringify(error)}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeSystem = async () => {
    if (!factoryCid) return;
    setIsInitializing(true);
    try {
      await ledger.exercise(factoryCid, Initializer.Factory.Initialize, {
        systemRelayerOwner: systemRelayerOwner as Party,
        localChainId,
        manager: currentParty,
        systemFee
      });
    } catch (error) {
      alert(`Error initializing system: ${JSON.stringify(error)}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const createChain = async () => {
    setIsCreatingChain(true);
    try {
      await ledger.create(Chain, {
        id: chainId,
        manager: currentParty,
        name: chainName,
        chainType
      });
    } catch (error) {
      alert(`Error creating chain: ${JSON.stringify(error)}`);
    } finally {
      setIsCreatingChain(false);
    }
  };

  const addTrustedAddress = async () => {
    if (!factoryCid || !selectedChain) return;
    setIsAddingTrustedAddress(true);
    try {
      await ledger.exercise(factoryCid, Initializer.Factory.AddTrustedAddress, {
        clientOwner: clientOwner as Party,
        address,
        chain: selectedChain
      });
    } catch (error) {
      alert(`Error adding trusted address: ${JSON.stringify(error)}`);
    } finally {
      setIsAddingTrustedAddress(false);
    }
  };

  return (
    <Grid centered columns={2}>
      <Grid.Row>
        <Grid.Column>
          <Header as='h2'>
            <Icon name='cogs' />
            System Management
          </Header>

          <Segment>
            <Header as='h3'>Create Factory</Header>
            <Button onClick={createFactory} loading={isInitializing} disabled={isInitializing}>
              Create Factory
            </Button>
            {factoryCid && <p>Factory created: {factoryCid}</p>}
          </Segment>

          <Segment>
            <Header as='h3'>Initialize System</Header>
            <Form>
              <Form.Input
                label="System Relayer Owner"
                value={systemRelayerOwner}
                onChange={(e) => setSystemRelayerOwner(e.target.value)}
                placeholder="Enter party ID"
              />
              <Form.Input
                label="Local Chain ID"
                type="number"
                value={localChainId}
                onChange={(e) => setLocalChainId(parseInt(e.target.value))}
              />
              <Form.Input
                label="System Fee"
                type="number"
                step="0.01"
                value={systemFee}
                onChange={(e) => setSystemFee(parseFloat(e.target.value))}
              />
              <Button onClick={initializeSystem} loading={isInitializing} disabled={isInitializing || !factoryCid}>
                Initialize System
              </Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Create Chain</Header>
            <Form onSubmit={createChain}>
              <Form.Input
                label="Chain ID"
                type="number"
                value={chainId}
                onChange={(e) => setChainId(parseInt(e.target.value))}
              />
              <Form.Input
                label="Chain Name"
                value={chainName}
                onChange={(e) => setChainName(e.target.value)}
              />
              <Form.Input
                label="Chain Type"
                type="number"
                value={chainType}
                onChange={(e) => setChainType(parseInt(e.target.value))}
              />
              <Button type="submit" loading={isCreatingChain} disabled={isCreatingChain}>
                Create Chain
              </Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Add Trusted Address</Header>
            <Form onSubmit={addTrustedAddress}>
              <Form.Input
                label="Client Owner"
                value={clientOwner}
                onChange={(e) => setClientOwner(e.target.value)}
                placeholder="Enter party ID"
              />
              <Form.Input
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter hex address"
              />
              <Form.Select
                label="Chain"
                options={chains.map(c => ({ key: c.contractId, text: c.payload.name, value: c.contractId }))}
                value={selectedChain}
                onChange={(e, { value }) => setSelectedChain(value as string)}
              />
              <Button type="submit" loading={isAddingTrustedAddress} disabled={isAddingTrustedAddress || !factoryCid}>
                Add Trusted Address
              </Button>
            </Form>
          </Segment>

          <Divider />

          <Segment>
            <Header as='h3'>Existing Chains</Header>
            <List divided relaxed>
              {chains.map((chain) => (
                <List.Item key={chain.contractId}>
                  <List.Icon name='chain' />
                  <List.Content>
                    <List.Header>{chain.payload.name} (ID: {chain.payload.id})</List.Header>
                    <List.Description>Type: {chain.payload.chainType}</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          </Segment>

          <Segment>
            <Header as='h3'>Trusted Addresses</Header>
            <List divided relaxed>
              {trustedAddresses.map((ta) => (
                <List.Item key={ta.contractId}>
                  <List.Icon name='address card' />
                  <List.Content>
                    <List.Header>{ta.payload.address}</List.Header>
                    <List.Description>Client Owner: {ta.payload.clientOwner}, Chain ID: {ta.payload.chain.id}</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          </Segment>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default SystemView;

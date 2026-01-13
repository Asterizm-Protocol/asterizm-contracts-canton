// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Icon, List, Segment, Divider } from 'semantic-ui-react';
import { Party } from '@daml/types';
import { userContext } from './App';
import { AmuletVault } from '@daml.js/asterizm-0.1.0';

const VaultsView: React.FC = () => {
  const [dsoParty, setDsoParty] = useState('');
  const [vaultParty, setVaultParty] = useState('');
  const [clientCid, setClientCid] = useState('');
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  const [proposalCid, setProposalCid] = useState('');
  const [isAcceptingProposal, setIsAcceptingProposal] = useState(false);

  const [amount, setAmount] = useState(1000);
  const [isFunding, setIsFunding] = useState(false);

  const ledger = userContext.useLedger();
  const currentParty = userContext.useParty();

  const vaultProposals = userContext.useStreamQueries(AmuletVault.AmuletVaultProposal).contracts;
  const vaults = userContext.useStreamQueries(AmuletVault.AmuletVault).contracts;

  const createAmuletVaultProposal = async () => {
    if (!clientCid) return;
    setIsCreatingProposal(true);
    try {
      const cid = await ledger.exercise(clientCid, AmuletVault.Client.CreateAmuletVaultProposal, {
        dsoParty: dsoParty as Party,
        vaultParty: vaultParty as Party
      });
      setProposalCid(cid.contractId);
    } catch (error) {
      alert(`Error creating vault proposal: ${JSON.stringify(error)}`);
    } finally {
      setIsCreatingProposal(false);
    }
  };

  const acceptAmuletVaultProposal = async () => {
    if (!proposalCid) return;
    setIsAcceptingProposal(true);
    try {
      await ledger.exercise(proposalCid, AmuletVault.AmuletVaultProposal.Accept, {});
    } catch (error) {
      alert(`Error accepting vault proposal: ${JSON.stringify(error)}`);
    } finally {
      setIsAcceptingProposal(false);
    }
  };

  const fundVault = async () => {
    // This would require access to the registry and amulet funding logic
    // For now, just a placeholder
    setIsFunding(true);
    try {
      alert('Funding vault - this requires registry setup');
    } catch (error) {
      alert(`Error funding vault: ${JSON.stringify(error)}`);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <Grid centered columns={2}>
      <Grid.Row>
        <Grid.Column>
          <Header as='h2'>
            <Icon name='shield' />
            Vault Management
          </Header>

          <Segment>
            <Header as='h3'>Create Amulet Vault Proposal</Header>
            <Form onSubmit={createAmuletVaultProposal}>
              <Form.Input
                label="DSO Party"
                value={dsoParty}
                onChange={(e) => setDsoParty(e.target.value)}
                placeholder="Enter DSO party ID"
              />
              <Form.Input
                label="Vault Party"
                value={vaultParty}
                onChange={(e) => setVaultParty(e.target.value)}
                placeholder="Enter vault party ID"
              />
              <Form.Input
                label="Client Contract ID"
                value={clientCid}
                onChange={(e) => setClientCid(e.target.value)}
                placeholder="Enter client contract ID"
              />
              <Button type="submit" loading={isCreatingProposal} disabled={isCreatingProposal || !clientCid}>
                Create Vault Proposal
              </Button>
            </Form>
            {proposalCid && <p>Proposal created: {proposalCid}</p>}
          </Segment>

          <Segment>
            <Header as='h3'>Accept Amulet Vault Proposal</Header>
            <Form onSubmit={acceptAmuletVaultProposal}>
              <Form.Input
                label="Proposal Contract ID"
                value={proposalCid}
                onChange={(e) => setProposalCid(e.target.value)}
                placeholder="Enter proposal contract ID"
              />
              <Button type="submit" loading={isAcceptingProposal} disabled={isAcceptingProposal || !proposalCid}>
                Accept Proposal
              </Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Fund Vault</Header>
            <Form onSubmit={fundVault}>
              <Form.Input
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
              />
              <Button type="submit" loading={isFunding} disabled={isFunding}>
                Fund Vault
              </Button>
            </Form>
          </Segment>

          <Divider />

          <Segment>
            <Header as='h3'>Vault Proposals</Header>
            <List divided relaxed>
              {vaultProposals.map((proposal) => (
                <List.Item key={proposal.contractId}>
                  <List.Icon name='file alternate outline' />
                  <List.Content>
                    <List.Header>Proposal for {proposal.payload.vaultParty}</List.Header>
                    <List.Description>DSO: {proposal.payload.dsoParty}</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          </Segment>

          <Segment>
            <Header as='h3'>Vaults</Header>
            <List divided relaxed>
              {vaults.map((vault) => (
                <List.Item key={vault.contractId}>
                  <List.Icon name='shield' />
                  <List.Content>
                    <List.Header>Vault for {vault.payload.vaultParty}</List.Header>
                    <List.Description>Client: {vault.payload.client}</List.Description>
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

export default VaultsView;

// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Icon, List, Segment, Divider } from 'semantic-ui-react';
import { Party } from '@daml/types';
import { userContext } from './App';
import { Client } from '@daml.js/asterizm-0.1.0';

const ClientsView: React.FC = () => {
  const [owner, setOwner] = useState('');
  const [manager, setManager] = useState('');
  const [disableHashValidation, setDisableHashValidation] = useState(false);
  const [localChainId, setLocalChainId] = useState(1);
  const [notifyTransferSendingResult, setNotifyTransferSendingResult] = useState(true);
  const [refundEnabled, setRefundEnabled] = useState(true);
  const [senders, setSenders] = useState('');
  const [customRelayContract, setCustomRelayContract] = useState('');
  const [trustedAddress, setTrustedAddress] = useState('');
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  const [proposalCid, setProposalCid] = useState('');
  const [isAcceptingProposal, setIsAcceptingProposal] = useState(false);

  const ledger = userContext.useLedger();
  const currentParty = userContext.useParty();

  const clientProposals = userContext.useStreamQueries(Client.ClientProposal).contracts;
  const clients = userContext.useStreamQueries(Client.Client).contracts;

  const createClientProposal = async () => {
    setIsCreatingProposal(true);
    try {
      const cid = await ledger.create(Client.ClientProposal, {
        owner: owner as Party,
        manager: manager as Party,
        disableHashValidation,
        localChainId,
        notifyTransferSendingResult,
        refundEnabled,
        senders: senders.split(',').map(s => s.trim() as Party),
        customRelayContract,
        trustedAddress
      });
      setProposalCid(cid.contractId);
    } catch (error) {
      alert(`Error creating client proposal: ${JSON.stringify(error)}`);
    } finally {
      setIsCreatingProposal(false);
    }
  };

  const acceptClientProposal = async () => {
    if (!proposalCid) return;
    setIsAcceptingProposal(true);
    try {
      await ledger.exercise(proposalCid, Client.ClientProposal.AcceptClientProposal, {});
    } catch (error) {
      alert(`Error accepting client proposal: ${JSON.stringify(error)}`);
    } finally {
      setIsAcceptingProposal(false);
    }
  };

  return (
    <Grid centered columns={2}>
      <Grid.Row>
        <Grid.Column>
          <Header as='h2'>
            <Icon name='user secret' />
            Client Management
          </Header>

          <Segment>
            <Header as='h3'>Create Client Proposal</Header>
            <Form onSubmit={createClientProposal}>
              <Form.Input
                label="Owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Enter party ID"
              />
              <Form.Input
                label="Manager"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="Enter party ID"
              />
              <Form.Checkbox
                label="Disable Hash Validation"
                checked={disableHashValidation}
                onChange={(e, { checked }) => setDisableHashValidation(checked || false)}
              />
              <Form.Input
                label="Local Chain ID"
                type="number"
                value={localChainId}
                onChange={(e) => setLocalChainId(parseInt(e.target.value))}
              />
              <Form.Checkbox
                label="Notify Transfer Sending Result"
                checked={notifyTransferSendingResult}
                onChange={(e, { checked }) => setNotifyTransferSendingResult(checked || false)}
              />
              <Form.Checkbox
                label="Refund Enabled"
                checked={refundEnabled}
                onChange={(e, { checked }) => setRefundEnabled(checked || false)}
              />
              <Form.Input
                label="Senders (comma-separated)"
                value={senders}
                onChange={(e) => setSenders(e.target.value)}
                placeholder="Enter party IDs separated by commas"
              />
              <Form.Input
                label="Custom Relay Contract"
                value={customRelayContract}
                onChange={(e) => setCustomRelayContract(e.target.value)}
                placeholder="Enter contract ID"
              />
              <Form.Input
                label="Trusted Address"
                value={trustedAddress}
                onChange={(e) => setTrustedAddress(e.target.value)}
                placeholder="Enter contract ID"
              />
              <Button type="submit" loading={isCreatingProposal} disabled={isCreatingProposal}>
                Create Proposal
              </Button>
            </Form>
            {proposalCid && <p>Proposal created: {proposalCid}</p>}
          </Segment>

          <Segment>
            <Header as='h3'>Accept Client Proposal</Header>
            <Form onSubmit={acceptClientProposal}>
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

          <Divider />

          <Segment>
            <Header as='h3'>Client Proposals</Header>
            <List divided relaxed>
              {clientProposals.map((proposal) => (
                <List.Item key={proposal.contractId}>
                  <List.Icon name='file alternate outline' />
                  <List.Content>
                    <List.Header>Proposal by {proposal.payload.owner}</List.Header>
                    <List.Description>Manager: {proposal.payload.manager}, Local Chain ID: {proposal.payload.localChainId}</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
          </Segment>

          <Segment>
            <Header as='h3'>Clients</Header>
            <List divided relaxed>
              {clients.map((client) => (
                <List.Item key={client.contractId}>
                  <List.Icon name='user secret' />
                  <List.Content>
                    <List.Header>Client for {client.payload.owner}</List.Header>
                    <List.Description>Local Chain ID: {client.payload.localChainId}</List.Description>
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

export default ClientsView;

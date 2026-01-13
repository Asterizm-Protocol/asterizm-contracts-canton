// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Icon, List, Segment } from 'semantic-ui-react';
import { Party } from '@daml/types';
import { userContext } from './App';

const PartiesView: React.FC = () => {
  const [partyName, setPartyName] = useState('');
  const [createdParties, setCreatedParties] = useState<Party[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const ledger = userContext.useLedger();
  const currentParty = userContext.useParty();

  // Predefined parties from client tests
  const predefinedParties = [
    'vaultParty',
    'fredUser',
    'aliceRelayOwner',
    'bobClientOwner',
    'charlieSender',
    'manager',
    'dsoParty',
    'user'
  ];

  const createParty = async () => {
    if (!partyName.trim()) return;
    setIsCreating(true);
    try {
      // In a real Daml app, parties are allocated by the ledger admin.
      // For demo purposes, we'll simulate by storing locally.
      // In production, this would be done via script or admin interface.
      const newParty = partyName as Party;
      setCreatedParties(prev => [...prev, newParty]);
      setPartyName('');
    } catch (error) {
      alert(`Error creating party: ${JSON.stringify(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const createPredefinedParty = async (party: string) => {
    if (createdParties.includes(party as Party)) return;
    setIsCreating(true);
    try {
      const newParty = party as Party;
      setCreatedParties(prev => [...prev, newParty]);
    } catch (error) {
      alert(`Error creating party: ${JSON.stringify(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Grid centered columns={2}>
      <Grid.Row>
        <Grid.Column>
          <Header as='h2'>
            <Icon name='users' />
            Party Management
          </Header>
          <Segment>
            <Header as='h3'>Quick Create Test Parties</Header>
            <p>Create parties needed for client tests:</p>
            <Button.Group>
              {predefinedParties.map((party) => (
                <Button
                  key={party}
                  onClick={() => createPredefinedParty(party)}
                  disabled={createdParties.includes(party as Party)}
                  loading={isCreating}
                >
                  {party}
                </Button>
              ))}
            </Button.Group>
          </Segment>
          <Segment>
            <Header as='h3'>Create Custom Party</Header>
            <Form onSubmit={createParty}>
              <Form.Input
                fluid
                placeholder="Enter party name (e.g., manager, clientOwner)"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                action={
                  <Button type="submit" loading={isCreating} disabled={isCreating}>
                    Create
                  </Button>
                }
              />
            </Form>
          </Segment>
          <Segment>
            <Header as='h3'>Created Parties</Header>
            <List divided relaxed>
              {createdParties.map((party, index) => (
                <List.Item key={index}>
                  <List.Icon name='user' />
                  <List.Content>
                    <List.Header>{party}</List.Header>
                    <List.Description>Created for demo purposes</List.Description>
                  </List.Content>
                </List.Item>
              ))}
              <List.Item>
                <List.Icon name='user' />
                <List.Content>
                  <List.Header>{currentParty}</List.Header>
                  <List.Description>Current logged-in party</List.Description>
                </List.Content>
              </List.Item>
            </List>
          </Segment>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
};

export default PartiesView;

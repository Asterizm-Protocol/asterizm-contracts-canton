// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Icon, List, Segment, Divider, Tab } from 'semantic-ui-react';
import { Party } from '@daml/types';
import { userContext } from './App';
import { Client, AmuletVault, InitMessage, TransferAccount } from '@daml.js/asterizm-0.1.0';

const TransfersView: React.FC = () => {
  // Transfer Message
  const [clientCid, setClientCid] = useState('');
  const [relayOwner, setRelayOwner] = useState('');
  const [txId, setTxId] = useState(1);
  const [transferHash, setTransferHash] = useState('');
  const [transferAccountCid, setTransferAccountCid] = useState('');
  const [isTransferringMessage, setIsTransferringMessage] = useState(false);

  // Send from Vault
  const [vaultCid, setVaultCid] = useState('');
  const [receiver, setReceiver] = useState('');
  const [sendAmount, setSendAmount] = useState(10.0);
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Transfer Sending Result
  const [statusCode, setStatusCode] = useState(0);
  const [isSendingResult, setIsSendingResult] = useState(false);

  // Send Raw
  const [isSendingRaw, setIsSendingRaw] = useState(false);

  // Receive to Vault
  const [transferInstructionCid, setTransferInstructionCid] = useState('');
  const [acceptArg, setAcceptArg] = useState('');
  const [sendClientTxIdCid, setSendClientTxIdCid] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // Send Message with Value
  const [sender, setSender] = useState('');
  const [value, setValue] = useState(0.2);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Resend Message
  const [resendValue, setResendValue] = useState(0.15);
  const [isResending, setIsResending] = useState(false);

  const ledger = userContext.useLedger();
  const currentParty = userContext.useParty();

  const transferAccounts = userContext.useStreamQueries(TransferAccount.TransferAccount).contracts;

  const transferMessage = async () => {
    if (!clientCid) return;
    setIsTransferringMessage(true);
    try {
      await ledger.exercise(clientCid, Client.Client.TransferMessage, {
        relayOwner: relayOwner as Party,
        txId,
        transferHash,
        transferAccountCid: transferAccountCid || undefined
      });
    } catch (error) {
      alert(`Error transferring message: ${JSON.stringify(error)}`);
    } finally {
      setIsTransferringMessage(false);
    }
  };

  const sendFromVault = async () => {
    if (!vaultCid) return;
    setIsSending(true);
    try {
      await ledger.exercise(vaultCid, AmuletVault.AmuletVault.Send, {
        context: {}, // Need proper context
        inputs: [], // Need proper inputs
        transferPreapprovalCid: '', // Need proper preapproval
        receiver: receiver as Party,
        amount: sendAmount,
        description: description ? [description] : [],
        txId,
        transferHash,
        transferAccountCid
      });
    } catch (error) {
      alert(`Error sending from vault: ${JSON.stringify(error)}`);
    } finally {
      setIsSending(false);
    }
  };

  const transferSendingResult = async () => {
    if (!clientCid) return;
    setIsSendingResult(true);
    try {
      await ledger.exercise(clientCid, Client.Client.TransferSendingResult, {
        relayOwner: relayOwner as Party,
        transferHash,
        statusCode
      });
    } catch (error) {
      alert(`Error sending transfer result: ${JSON.stringify(error)}`);
    } finally {
      setIsSendingResult(false);
    }
  };

  const sendRaw = async () => {
    if (!vaultCid) return;
    setIsSendingRaw(true);
    try {
      await ledger.exercise(vaultCid, AmuletVault.AmuletVault.SendRaw, {
        context: {}, // Need proper context
        inputs: [], // Need proper inputs
        transferPreapprovalCid: '', // Need proper preapproval
        receiver: receiver as Party,
        amount: sendAmount,
        description: description ? [description] : []
      });
    } catch (error) {
      alert(`Error sending raw: ${JSON.stringify(error)}`);
    } finally {
      setIsSendingRaw(false);
    }
  };

  const receiveToVault = async () => {
    if (!vaultCid || !transferInstructionCid) return;
    setIsReceiving(true);
    try {
      await ledger.exercise(vaultCid, AmuletVault.AmuletVault.TransferInstruction_Accept, {
        transferInstructionCid,
        acceptArg: {}, // Need proper accept arg
        sendClientTxIdCid
      });
    } catch (error) {
      alert(`Error receiving to vault: ${JSON.stringify(error)}`);
    } finally {
      setIsReceiving(false);
    }
  };

  const sendMessageWithValue = async () => {
    if (!clientCid) return;
    setIsSendingMessage(true);
    try {
      await ledger.exercise(clientCid, Client.Client.SendMessageWithValue, {
        sender: sender as Party,
        txId,
        transferHash,
        value,
        transferAccountCid
      });
    } catch (error) {
      alert(`Error sending message with value: ${JSON.stringify(error)}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const resendMessage = async () => {
    if (!clientCid) return;
    setIsResending(true);
    try {
      await ledger.exercise(clientCid, Client.Client.ResendMessage, {
        sender: sender as Party,
        transferHash,
        value: resendValue,
        transferAccountCid
      });
    } catch (error) {
      alert(`Error resending message: ${JSON.stringify(error)}`);
    } finally {
      setIsResending(false);
    }
  };

  const panes = [
    {
      menuItem: 'Receive from Vault',
      render: () => (
        <Tab.Pane>
          <Segment>
            <Header as='h3'>Transfer Message (Receive)</Header>
            <Form onSubmit={transferMessage}>
              <Form.Input label="Client Contract ID" value={clientCid} onChange={(e) => setClientCid(e.target.value)} />
              <Form.Input label="Relay Owner" value={relayOwner} onChange={(e) => setRelayOwner(e.target.value)} />
              <Form.Input label="Tx ID" type="number" value={txId} onChange={(e) => setTxId(parseInt(e.target.value))} />
              <Form.Input label="Transfer Hash" value={transferHash} onChange={(e) => setTransferHash(e.target.value)} />
              <Form.Input label="Transfer Account CID (optional)" value={transferAccountCid} onChange={(e) => setTransferAccountCid(e.target.value)} />
              <Button type="submit" loading={isTransferringMessage}>Transfer Message</Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Send from Vault</Header>
            <Form onSubmit={sendFromVault}>
              <Form.Input label="Vault Contract ID" value={vaultCid} onChange={(e) => setVaultCid(e.target.value)} />
              <Form.Input label="Receiver" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
              <Form.Input label="Amount" type="number" step="0.01" value={sendAmount} onChange={(e) => setSendAmount(parseFloat(e.target.value))} />
              <Form.Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button type="submit" loading={isSending}>Send from Vault</Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Transfer Sending Result</Header>
            <Form onSubmit={transferSendingResult}>
              <Form.Input label="Status Code" type="number" value={statusCode} onChange={(e) => setStatusCode(parseInt(e.target.value))} />
              <Button type="submit" loading={isSendingResult}>Send Result</Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Send Raw</Header>
            <Form onSubmit={sendRaw}>
              <Button type="submit" loading={isSendingRaw}>Send Raw</Button>
            </Form>
          </Segment>
        </Tab.Pane>
      ),
    },
    {
      menuItem: 'Send to Vault',
      render: () => (
        <Tab.Pane>
          <Segment>
            <Header as='h3'>Receive to Vault</Header>
            <Form onSubmit={receiveToVault}>
              <Form.Input label="Transfer Instruction CID" value={transferInstructionCid} onChange={(e) => setTransferInstructionCid(e.target.value)} />
              <Form.Input label="Send Client Tx ID CID" value={sendClientTxIdCid} onChange={(e) => setSendClientTxIdCid(e.target.value)} />
              <Button type="submit" loading={isReceiving}>Receive to Vault</Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Send Message with Value</Header>
            <Form onSubmit={sendMessageWithValue}>
              <Form.Input label="Sender" value={sender} onChange={(e) => setSender(e.target.value)} />
              <Form.Input label="Value" type="number" step="0.01" value={value} onChange={(e) => setValue(parseFloat(e.target.value))} />
              <Button type="submit" loading={isSendingMessage}>Send Message</Button>
            </Form>
          </Segment>

          <Segment>
            <Header as='h3'>Resend Message</Header>
            <Form onSubmit={resendMessage}>
              <Form.Input label="Resend Value" type="number" step="0.01" value={resendValue} onChange={(e) => setResendValue(parseFloat(e.target.value))} />
              <Button type="submit" loading={isResending}>Resend Message</Button>
            </Form>
          </Segment>
        </Tab.Pane>
      ),
    },
  ];

  return (
    <Grid centered columns={2}>
      <Grid.Row>
        <Grid.Column>
          <Header as='h2'>
            <Icon name='exchange' />
            Transfer Operations
          </Header>

          <Tab panes={panes} />

          <Divider />

          <Segment>
            <Header as='h3'>Transfer Accounts</Header>
            <List divided relaxed>
              {transferAccounts.map((account) => (
                <List.Item key={account.contractId}>
                  <List.Icon name='address card' />
                  <List.Content>
                    <List.Header>Transfer Account</List.Header>
                    <List.Description>Hash: {account.payload.transferHash}, Success: {account.payload.successReceive ? 'Yes' : 'No'}</List.Description>
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

export default TransfersView;

# Asterizm SDK

Asterizm is a cross-chain protocol for transferring amulet tokens between different blockchain networks using Daml smart contracts.

## Architecture

The SDK consists of several key components that work together to enable secure cross-chain transfers:

### Core Contracts

- **AmuletVault**: The central vault contract that handles locking and unlocking of amulet tokens for cross-chain transfers. It processes transfer instructions, validates payloads, and manages the transfer lifecycle including refunds.

- **Client**: Represents a user or entity participating in cross-chain transfers. It manages sending messages with fees to relayers and receiving transfer confirmations.

- **TransferAccount**: Tracks the state of individual transfers, including whether they have been received, executed, or refunded.

### Supporting Contracts

- **Initializer**: Factory contract for setting up the system, including chains, trusted addresses, and relayer configurations.

- **Chain**: Represents a blockchain network with an ID, name, and type.

- **TrustedAddress**: Stores trusted addresses on external chains for secure communication.

- **CustomRelayer**: Defines relayer configurations including fees and ownership.

### Message Format

- **InitMessage**: Standardized message format for cross-chain communication, containing source/destination addresses, chain IDs, transaction IDs, and payload data.

### Events

- **InitiateTransferEvent**: Emitted when a transfer is initiated from the vault.
- **PayloadReceivedEvent**: Emitted when a transfer payload is received.
- **TransferSendingResultEvent**: Reports the result of sending a transfer.

### Client Operations

The Client contract supports:
- **SendMessageWithValue**: Send a cross-chain message with payment to the relayer.
- **ResendMessage**: Retry sending a failed message.
- **TransferMessage**: Receive and process an incoming transfer.
- **TransferSendingResult**: Handle sending result notifications.

### Vault Operations

The AmuletVault supports:
- **TransferInstruction_Accept**: Accept incoming amulet deposits and initiate cross-chain transfer.
- **Send**: Execute outgoing transfers to recipients.
- **SendRaw**: Direct transfer without full validation.
- **ConfirmIncomingRefund**: Handle refund confirmations.

## Getting Started

### Prerequisites

- [Daml SDK](https://docs.daml.com/getting-started/installation.html) installed
- Canton ledger (for running the application)
- Node.js and npm (for the UI)

### Building the SDK

1. Navigate to the SDK directory:
   ```bash
   cd sdk
   ```

2. Build the Daml project:
   ```bash
   daml build
   ```

### Running Tests

The project includes comprehensive tests for client send and receive operations.

1. Navigate to the tests directory:
   ```bash
   cd tests
   ```

2. Build and run the tests:
   ```bash
   daml build
   daml test
   ```

The tests demonstrate:
- Setting up parties, chains, and trusted addresses
- Creating clients and vaults
- Depositing amulets to the vault
- Sending cross-chain messages with fees
- Receiving transfers and unlocking amulets
- Handling transfer results and refunds

### Running the UI

1. Navigate to the UI directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The UI will be available at `http://localhost:3000` and connects to a running Canton ledger.

### Project Structure

```
.
├── sdk/                 # Core Daml contracts
│   ├── src/
│   │   └── Asterizm/
│   │       ├── AmuletVault.daml
│   │       ├── Client/
│   │       │   ├── Client.daml
│   │       │   └── Proposal.daml
│   │       ├── Chain.daml
│   │       ├── CustomRelayer.daml
│   │       ├── Initializer.daml
│   │       ├── InitMessage.daml
│   │       ├── TransferAccount.daml
│   │       └── TrustedAddress.daml
│   └── daml.yaml
├── tests/               # Test scripts
│   ├── src/
│   │   ├── ClientSendToVaultTest.daml
│   │   └── ClientReceiveFromVaultTest.daml
│   └── daml.yaml
├── ui/                  # React frontend
│   ├── src/
│   ├── package.json
│   └── ...
├── dars/                # Splice dependencies
└── README.md
```

## Usage Examples

### Setting up a Cross-Chain Transfer

1. Initialize the system with chains and trusted addresses
2. Create a Client contract for the user
3. Create an AmuletVault for holding tokens
4. Deposit amulets to the vault via TransferInstruction
5. Send a message to initiate the cross-chain transfer
6. On the destination chain, receive the transfer and unlock tokens

### Client Send Flow

```daml
-- Create client
clientCid <- create Client with { ... }

-- Send message with value
(updatedTransferAccountCid, sendMessageEventCid) <- exercise clientCid SendMessageWithValue with
    sender = senderParty
    txId = 1
    transferHash = hash
    value = 0.2
    transferAccountCid = transferAccount
```

### Client Receive Flow

```daml
-- Receive transfer message
(payloadReceived, transferAccount) <- exercise clientCid TransferMessage with
    relayOwner = relayParty
    txId = 1
    transferHash = hash
    transferAccountCid = None

-- Send amulets from vault
result <- exercise vaultCid AmuletVault_Send with
    context = transferContext
    inputs = amuletInputs
    transferPreapprovalCid = preapproval
    receiver = recipient
    amount = 10.0
    txId = 1
    transferHash = hash
    transferAccountCid = transferAccount
```

## Test Scenarios

The SDK includes comprehensive test scenarios demonstrating client send and receive operations. Below is a detailed walkthrough of the test flows.

### Client Send to Vault Test

This test demonstrates the complete flow of sending amulets from a client through the vault to another chain.

#### Setup Participants
- **Registry**: Amulet registry for token management
- **Vault Party**: Party controlling the amulet vault
- **Fred User**: User depositing amulets to the vault
- **Alice Relay Owner**: Owner of the relay service
- **Bob Client Owner**: Owner of the client contract
- **DSO Party**: Digital Securities Operator
- **Charlie Sender**: Authorized sender for the client
- **Manager**: System manager for initialization

#### System Initialization
1. Create Factory contract by manager
2. Initialize system with relay owner, local chain ID (1), and system fee (0.1)
3. Add destination chain (ID: 2, Name: "Ethereum")
4. Add local chain (ID: 1, Name: "Local")
5. Add trusted address for destination chain
6. Add trusted address for local chain

#### Client and Vault Setup
1. Create Client Proposal with:
   - Owner: bobClientOwner
   - Manager: manager
   - Disable hash validation: false
   - Local chain ID: 1
   - Notify transfer sending result: true
   - Refund enabled: true
   - Senders: [charlieSender]
   - Custom relay contract
   - Trusted address
2. Manager accepts the client proposal
3. Create Amulet Vault Proposal via client
4. Vault party accepts the proposal, creating the vault

#### Transfer Flow
1. Create SendClientTxId contract with initial txId = 1
2. Fund Fred User with 100 amulets
3. Create transfer instruction to deposit 10 amulets from Fred to vault
4. Accept transfer instruction in vault, which:
   - Validates instrument ID matches amulet
   - Creates InitiateTransferEvent
   - Creates TransferAccount
   - Increments txId

#### Client Send Operations
1. **Send Message with Value**:
   - Sender: charlieSender
   - TxId: 1
   - Transfer hash: calculated from init message
   - Value: 0.2 (fee)
   - Transfer account CID
   - Creates SendMessageEvent
   - Marks transfer as executed by sender

2. **Resend Message**:
   - Sender: charlieSender
   - Transfer hash
   - Value: 0.15
   - Creates ResendMessageEvent

#### Assertions
- InitiateTransferEvent fields match expected values
- SendMessageEvent has correct txId, value, transfer hash, addresses
- ResendMessageEvent has correct addresses and transfer hash
- Transfer account is marked as executed

### Client Receive from Vault Test

This test demonstrates receiving transfers from another chain and unlocking amulets from the vault.

#### Setup Participants
- Similar to send test: registry, vaultParty, fredUser, aliceRelayOwner, bobClientOwner, charlieSender, manager

#### System Initialization
1. Create Factory and initialize system
2. Add source chain (ID: 2, Name: "Ethereum") with source address
3. Create Client contract via proposal and acceptance
4. Create Amulet Vault Proposal and acceptance
5. Fund vault with 1000 amulets

#### Receive Transfer Flow
1. **Transfer Message** (simulating relay):
   - Relay owner: aliceRelayOwner
   - TxId: 1
   - Transfer hash: calculated from init message
   - Transfer account CID: None
   - Creates PayloadReceivedEvent
   - Creates TransferAccount with successReceive = true

2. **Amulet Vault Send**:
   - Context: payment transfer context
   - Inputs: amulet holdings
   - Transfer preapproval for fredUser
   - Receiver: fredUser
   - Amount: 10.0
   - TxId: 1
   - Transfer hash
   - Transfer account CID
   - Validates transfer hash and marks as executed
   - Transfers amulets from vault to fredUser

3. **Transfer Sending Result**:
   - Relay owner: aliceRelayOwner
   - Transfer hash
   - Status code: 0
   - Creates TransferSendingResultEvent

4. **Amulet Vault Send Raw**:
   - Similar to Send but without full validation
   - Direct transfer of 10.0 amulets to fredUser

#### Assertions
- PayloadReceivedEvent fields match expected values
- TransferAccount created with successReceive = true
- After Send: fredUser balance = 10.0, vault balance ≈ 990.0
- TransferSendingResultEvent has correct dstAddress, transferHash, statusCode = 0
- After SendRaw: fredUser balance = 20.0, vault balance ≈ 980.0

See the test files `ClientSendToVaultTest.daml` and `ClientReceiveFromVaultTest.daml` for complete working examples.

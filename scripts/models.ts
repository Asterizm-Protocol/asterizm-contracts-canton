import 'dotenv/config';
import { InstrumentId } from './ledger-api';

export const transferProvider = process.env.ENVIRONMENT === 'devnet' ?
    'brikly-devnet-1::1220a391faa29a55a7e67c8b854d6f8b218b2fe3517683d0a6a70e370a4b97b4b217' :
    'brikly-mainnet-1::122007725fa01ff8d201e87afc2a3c04b8dd67fd65660e9acb68a72ca54a59b5f610';

export const DSO = process.env.ENVIRONMENT === 'devnet' ?
    'DSO::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a' :
    'DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc';

export const synchronizerId = process.env.ENVIRONMENT === 'devnet' ?
    'global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a' :
    'global-domain::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc';


export const instrumentId: InstrumentId = {
    id: 'Amulet',
    admin: DSO,
}

export const cantonChainId = process.env.CANTON_CHAIN_ID!;

export const dstChainId = process.env.DST_CHAIN_ID!;
export const dstChainName = process.env.DST_CHAIN_NAME!
export const dstChainTrustedAddress = process.env.DST_CHAIN_TRUSTED_ADDRESS!.replace(/^0x/i, '').toLowerCase();
export const dstChainUserAddress = process.env.DST_CHAIN_USER_ADDRESS!.replace(/^0x/i, '').toLowerCase();

export const asterizmPackageId = process.env.ASTERIZM_PACKAGE_ID!;
export const initializerFactoryTemplateId = `${asterizmPackageId}:Asterizm.Initializer:Factory`;
export const chainTemplateId = `${asterizmPackageId}:Asterizm.Chain:Chain`;
export const clientProposalTemplateId = `${asterizmPackageId}:Asterizm.Client.Proposal:ClientProposal`;
export const clientTemplateId = `${asterizmPackageId}:Asterizm.Client.Client:Client`;
export const amuletVaultWithLockProposalTemplateId = `${asterizmPackageId}:Asterizm.AmuletVaultWithLock:AmuletVaultWithLockProposal`;
export const amuletVaultWithLockTemplateId = `${asterizmPackageId}:Asterizm.AmuletVaultWithLock:AmuletVaultWithLock`;
export const sendClientTxIdTemplateId = `${asterizmPackageId}:Asterizm.AmuletVaultWithLock:SendClientTxId`;
export const amuletVaultUserServiceTemplateId = `${asterizmPackageId}:Asterizm.AmuletVaultWithLock:AmuletVaultUserService`;
export const amuletVaultWithLockPaymentTemplateId = `${asterizmPackageId}:Asterizm.AmuletVaultWithLock:AmuletVaultWithLockPayment`;

export const managerParty = process.env.MANAGER_PARTY!;
export const vaultParty = process.env.VAULT_PARTY!;
export const relayOwnerParty = process.env.RELAY_OWNER_PARTY!;
export const clientOwnerParty = process.env.CLIENT_OWNER_PARTY!;
export const clientSenderParty = process.env.CLIENT_SENDER_PARTY!;
export const userParty = process.env.USER_PARTY!;
export const systemFee = 0.1

export const holdingInterface = '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding';
export const transferFactoryTemplateId = '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory';

export type InitMessage = {
    dstAddress: string;
    srcAddress: string;
    srcChainId: string;
    dstChainId: string;
    txId: string;
    payload: string;
}
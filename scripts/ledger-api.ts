
import 'dotenv/config';
import { Agent, setGlobalDispatcher } from 'undici';

const agent = new Agent({
    connectTimeout: 20_000,
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
    pipelining: 1,
    strictContentLength: false,
});

setGlobalDispatcher(agent);

const LEDGER_API_URL = process.env.LEDGER_API_URL!.replace(/\/+$/, '');
const WALLET_API_URL = process.env.WALLET_API_URL!.replace(/\/+$/, '');

let bearer = '';

export async function getLedgerEnd(): Promise<GetLedgerEndResponse> {
    const res = await authRequest(LEDGER_API_URL + '/v2/state/ledger-end', {
        method: 'GET',
    });

    const data = await res.json();
    return {
        offset: Number(data.offset),
    };
}

export async function submitAndWait(
    body: JsCommands,
): Promise<SubmitAndWaitResponse> {
    const url = LEDGER_API_URL + '/v2/commands/submit-and-wait';

    const res = await authRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, {
        retryOnSocket: false,
    });

    const data: any = await res.json();

    if ('completionOffset' in data) {
        return data as SubmitAndWaitResponse;
    }

    if (data.code === 'DUPLICATE_COMMAND' && data.context?.completionOffset) {
        return {
            updateId: data.context.updateId,
            completionOffset: Number(data.context.completionOffset),
        };
    }

    throw new Error(`submitAndWait unexpected response: ${JSON.stringify(data)}`);
}

export async function getActiveContracts(
    body: GetActiveContractsRequest,
    query: GetActiveContractsQuery = {},
): Promise<JsGetActiveContractsResponseItem[]> {
    const params = new URLSearchParams();
    if (typeof query.limit === 'number') {
        params.set('limit', String(query.limit));
    }
    if (typeof query.streamIdleTimeoutMs === 'number') {
        params.set('stream_idle_timeout_ms', String(query.streamIdleTimeoutMs));
    }

    let url = LEDGER_API_URL + '/v2/state/active-contracts';
    const qs = params.toString();
    if (qs) {
        url += `?${qs}`;
    }

    const res = await authRequest(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return data as JsGetActiveContractsResponseItem[];
}

export async function getTransactionTreeById(
    updateId: string,
    parties: string[],
): Promise<JsTransactionTree> {
    const params = new URLSearchParams();
    for (const p of parties) params.append('parties', p);

    const url = `${LEDGER_API_URL}/v2/updates/transaction-tree-by-id/${encodeURIComponent(updateId)}?${params.toString()}`;

    const res = await authRequest(url, { method: 'GET' });
    return res.json();
}

export async function getEventsByContractId(
    contractId: string,
    party: string,
): Promise<JsGetEventsByContractIdResponse> {
    const body: GetEventsByContractIdRequest = {
        contractId,
        eventFormat: {
            filtersByParty: {
                [party]: {
                    cumulative: [
                        {
                            identifierFilter: {
                                WildcardFilter: {
                                    value: {
                                        includeCreatedEventBlob: true,
                                    },
                                },
                            },
                        },
                    ],
                },
            },
            verbose: false,
        },
    };

    const res = await authRequest(
        LEDGER_API_URL + '/v2/events/events-by-contract-id',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    );

    return res.json();
}

export async function getDsoPartyId(): Promise<GetDsoPartyId> {
    const res = await authRequest(WALLET_API_URL + '/v0/scan-proxy/dso-party-id', {
        method: 'GET',
    });

    const data = await res.json();
    return {
        partyId: data.dso_party_id,
    }
}

export async function getInstruments(): Promise<GetInstruments> {
    const res = await authRequest(WALLET_API_URL + '/v0/scan-proxy/registry/metadata/v1/instruments', {
        method: 'GET',
    });

    const data = await res.json();
    return {
        instruments: data.instruments,
    }
}

export async function getTransferFactory(
    choiceArguments: TransferFactoryChoiceArguments,
): Promise<TransferFactoryData> {
    const res = await authRequest(
        WALLET_API_URL + '/v0/scan-proxy/registry/transfer-instruction/v1/transfer-factory',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                choiceArguments,
                excludeDebugFields: true,
            }),
        },
    );

    if (!res.ok) {
        throw new Error(`transfer-factory failed: ${res.status}`);
    }

    const data = await res.json();
    return data as TransferFactoryData;
}

export async function getAmuletRules(): Promise<AmuletRulesWithDomain> {
    const res = await authRequest(
        WALLET_API_URL + '/v0/scan-proxy/amulet-rules',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );

    if (!res.ok) {
        throw new Error(`amulet-rules failed: ${res.status}`);
    }

    const data = await res.json();
    return data as AmuletRulesWithDomain;
}

export async function getOpenAndIssuingMiningRounds(): Promise<MiningRoundsResponse> {
    const res = await authRequest(
        WALLET_API_URL + '/v0/scan-proxy/open-and-issuing-mining-rounds',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );

    if (!res.ok) {
        throw new Error(`open-and-issuing-mining-rounds failed: ${res.status}`);
    }

    const data = await res.json();
    return data as MiningRoundsResponse;
}


export async function getFeaturedApps(partyId: string): Promise<FeaturedAppRightResponse> {
    const res = await authRequest(
        WALLET_API_URL + '/v0/scan-proxy/featured-apps/' + partyId,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    );

    if (!res.ok) {
        throw new Error(`featured-apps failed: ${res.status}`);
    }

    const data = await res.json();
    return data as FeaturedAppRightResponse;
}

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

export async function authRequest(
    url: string,
    options: RequestInit = {},
    opts: { retryOnSocket?: boolean; socketRetries?: number } = {},
): Promise<Response> {
    if (!bearer) {
        bearer = await getBearerToken();
    }

    const { retryOnSocket = true, socketRetries = 3 } = opts;

    async function doRequest(retryAuth: boolean, retrySocketLeft: number): Promise<Response> {
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Authorization': `Bearer ${bearer}`,
                    'Accept': 'application/json',
                    'Connection': 'close',
                },
            });

            if (res.status === 401 && retryAuth) {
                bearer = await getBearerToken();
                return doRequest(false, retrySocketLeft);
            }

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`${url} failed: ${res.status} ${res.statusText} – ${text}`);
            }

            return res;
        } catch (e: any) {
            // тут твой UND_ERR_SOCKET
            if (retryOnSocket && e?.cause?.code === 'UND_ERR_SOCKET' && retrySocketLeft > 0) {
                console.warn('UND_ERR_SOCKET, retrying...', {
                    url,
                    retriesLeft: retrySocketLeft - 1,
                });
                await sleep(300);
                return doRequest(retryAuth, retrySocketLeft - 1);
            }

            console.error('authRequest failed', url, e);
            throw e;
        }
    }

    return doRequest(true, socketRetries);
}


async function getBearerToken(): Promise<string> {
    const url = process.env.AUTH_URL!;
    const params = new URLSearchParams();

    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.AUTH_CLIENT_ID!);
    params.append('client_secret', process.env.AUTH_CLIENT_SECRET!);
    params.append('audience', process.env.AUTH_AUDIENCE!);
    params.append('scope', 'daml_ledger_api');

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!res.ok) {
        throw new Error(`bad status ${res.status}`);
    }

    const data = await res.json();
    return data.access_token!;
}


export type GetLedgerEndResponse = {
    offset: number;
};

export type GetDsoPartyId = {
    partyId: string;
};

export type GetInstruments = {
    instruments: {
        id: string,
        name: string,
        symbol: string,
        totalSupply: string,
    }[];
};

export type Duration = {
    seconds: number;
    nanos: number;
};

export type DeduplicationPeriod =
    | { DeduplicationDuration: { maxDeduplicationDuration: Duration } }
    | { DeduplicationOffset: { startExclusive: string } }
    | { Empty: {} };

export type DamlInt = string | number;
export type DamlDecimal = string | number;
export type DamlTimestamp = string;
export type DamlDate = string;
export type DamlUnit = {};
export type DamlText = string;
export type DamlBool = boolean;
export type DamlContractId = string;
export type DamlParty = string;
export type DamlEnum = string;

export type DamlRecord = {
    [field: string]: DamlValue;
};

export type DamlList = DamlValue[];

export type DamlTextMap = {
    [key: string]: DamlValue;
};

export type DamlVariant = {
    tag: string;
    value: DamlValue;
};

export type DamlOptional = DamlValue | null;

export type DamlValue =
    | DamlInt
    | DamlDecimal
    | DamlTimestamp
    | DamlDate
    | DamlUnit
    | DamlText
    | DamlBool
    | DamlContractId
    | DamlParty
    | DamlEnum
    | DamlRecord
    | DamlList
    | DamlTextMap
    | DamlVariant
    | null;

export type CreateCommandPayload = {
    templateId: string;
    createArguments: DamlValue;
};

export type ExerciseCommandPayload = {
    templateId: string;
    contractId: string;
    choice: string;
    choiceArgument: DamlValue;
};

export type ExerciseByKeyCommandPayload = {
    templateId: string;
    contractKey: DamlValue;
    choice: string;
    choiceArgument: DamlValue;
};

export type CreateAndExerciseCommandPayload = {
    templateId: string;
    createArguments: DamlValue;
    choice: string;
    choiceArgument: DamlValue;
};

export type CreateCommand = {
    CreateCommand: CreateCommandPayload;
};

export type ExerciseCommand = {
    ExerciseCommand: ExerciseCommandPayload;
};

export type ExerciseByKeyCommand = {
    ExerciseByKeyCommand: ExerciseByKeyCommandPayload;
};

export type CreateAndExerciseCommand = {
    CreateAndExerciseCommand: CreateAndExerciseCommandPayload;
};

export type Command =
    | CreateAndExerciseCommand
    | CreateCommand
    | ExerciseByKeyCommand
    | ExerciseCommand;

export type JsCommands = {
    commandId: string;
    commands: Command[];
    actAs: string[];

    userId?: string;
    readAs?: string[];
    workflowId?: string;
    applicationId?: string;

    deduplicationPeriod?: DeduplicationPeriod;
    minLedgerTimeAbs?: string;
    minLedgerTimeRel?: Duration;
    submissionId?: string;
    disclosedContracts?: DisclosedContract[];
    synchronizerId?: string;
    packageIdSelectionPreference?: string[];
};

export type SubmitAndWaitResponse = {
    updateId: string;
    completionOffset: number;
};

export type WildcardFilter1 = {
    includeCreatedEventBlob?: boolean;
};

export type TemplateFilter1 = {
    templateId: string;
    includeCreatedEventBlob?: boolean;
};

export type InterfaceFilter1 = {
    interfaceId: string;
    includeInterfaceView?: boolean;
    includeCreatedEventBlob?: boolean;
};

export type WildcardFilter = {
    value: WildcardFilter1;
};

export type TemplateFilter = {
    value: TemplateFilter1;
};

export type InterfaceFilter = {
    value: InterfaceFilter1;
};

export type EmptyIdentifierFilter = {};

export type IdentifierFilter =
    | { Empty: EmptyIdentifierFilter }
    | { InterfaceFilter: InterfaceFilter }
    | { TemplateFilter: TemplateFilter }
    | { WildcardFilter: WildcardFilter };

export type CumulativeFilter = {
    identifierFilter: IdentifierFilter;
};

export type Filters = {
    cumulative?: CumulativeFilter[];
};

export type TransactionFilter = {
    filtersByParty: Record<string, Filters>;
    filtersForAnyParty?: Filters;
};

export type EventFormat = {
    filtersByParty: Record<string, Filters>;
    filtersForAnyParty?: Filters;
    verbose: boolean;
};

export type GetActiveContractsRequest = {
    filter?: TransactionFilter;
    verbose: boolean;
    activeAtOffset: number;
    eventFormat?: EventFormat;
};

export type GetActiveContractsQuery = {
    limit?: number;
    streamIdleTimeoutMs?: number;
};


export type JsStatus = {
    code: number;
    message: string;
    details?: unknown[];
};

export type JsInterfaceView = {
    interfaceId: string;
    viewStatus: JsStatus;
    viewValue?: unknown;
};

export type CreatedEvent = {
    offset: number;
    nodeId: number;
    contractId: string;
    templateId: string;
    contractKey?: unknown;
    createArgument?: DamlValue;
    createdEventBlob: string;
    interfaceViews?: JsInterfaceView[];
    witnessParties: string[];
    signatories: string[];
    observers: string[];
    createdAt: string;
    packageName: string;
};

export type JsActiveContract = {
    createdEvent: CreatedEvent;
    synchronizerId: string;
    reassignmentCounter: number;
};

export type JsIncompleteAssigned = {
    assignedEvent: unknown;
};

export type JsIncompleteUnassigned = {
    createdEvent: CreatedEvent;
    unassignedEvent: unknown;
};

export type JsEmpty = Record<string, never>;

export type JsContractEntry =
    | { JsActiveContract: JsActiveContract }
    | { JsEmpty: JsEmpty }
    | { JsIncompleteAssigned: JsIncompleteAssigned }
    | { JsIncompleteUnassigned: JsIncompleteUnassigned };

export type JsGetActiveContractsResponseItem = {
    workflowId: string;
    contractEntry: JsContractEntry;
};
export type ContractId = string;

export type JsCreateNode = {
    nodeId: number;
    contractId: ContractId;
    templateId: string;
    packageName: string;
    createArgument: DamlValue;
    createdEventBlob: string;
    signatories: string[];
    observers: string[];
    witnessParties: string[];
    key?: DamlValue;
    interfaceViews?: JsInterfaceView[];
};

export type JsExerciseNode = {
    nodeId: number;
    contractId: ContractId;
    templateId: string;
    packageName: string;
    choice: string;
    choiceArgument: DamlValue;
    actingParties: string[];
    consuming: boolean;
    witnessParties: string[];
    interfaceViews?: JsInterfaceView[];
    children: number[];
    exerciseResult?: DamlValue;
    exerciseEventBlob: string;
};

export type JsTreeEvent =
    | { CreatedTreeEvent: { value: JsCreateNode } }
    | { ExercisedTreeEvent: { value: JsExerciseNode } };

export type JsTransactionTreeTransaction = {
    updateId: string;
    workflowId: string;
    effectiveAt: string;
    offset: number;
    synchronizerId: string;
    eventsById: Record<number, JsTreeEvent>;
    rootEventIds: number[];
};

export type JsTransactionTree = {
    offset: number;
    transaction: JsTransactionTreeTransaction;
};

export type GetEventsByContractIdRequest = {
    contractId: string;
    eventFormat: EventFormat;
};

export type JsCreated = {
    createdEvent: CreatedEvent;
    synchronizerId: string;
};

export type ArchivedEvent = {
    offset: number;
    nodeId: number;
    contractId: string;
    templateId: string;
    witnessParties: string[];
    packageName: string;
    implementedInterfaces?: string[];
};

export type JsArchived = {
    archivedEvent: ArchivedEvent;
    synchronizerId: string;
};

export type JsGetEventsByContractIdResponse = {
    created?: JsCreated;
    archived?: JsArchived;
};

export type DisclosedContract = {
    templateId: string;
    contractId: string;
    createdEventBlob: string;
    synchronizerId: string;
    debugPackageName?: string;
    debugPayload?: unknown;
    debugCreatedAt?: string;
};

export type TransferFactoryData = {
    factoryId: string;
    transferKind: 'self' | 'direct' | string;
    choiceContext: Record<string, unknown>;
    disclosedContracts: DisclosedContract[];
};


export type MetaValues = {
    values: Record<string, unknown>;
};

export type TransferMeta = MetaValues;

export type InstrumentId = {
    id: string;
    admin: string;
};

export type TransferArgs = {
    sender: string;
    receiver: string;
    amount: string;
    instrumentId: InstrumentId;
    lock: null | string;
    requestedAt: string;
    executeBefore: string;
    inputHoldingCids: string[];
    meta: TransferMeta;
};

export type ExtraArgs = {
    context: MetaValues;
    meta: MetaValues;
};

export type TransferFactoryChoiceArguments = {
    expectedAdmin: string;
    transfer: TransferArgs;
    extraArgs: ExtraArgs;
};

export type SpliceContract<TPayload = unknown> = {
    template_id: string;
    contract_id: string;
    payload: TPayload;
    created_event_blob: string;
    created_at: string; // ISO8601
};

export type ContractWithDomain<TPayload = unknown> = {
    contract: SpliceContract<TPayload>;
    domain_id: string;
};

export type AmuletRulesWithDomain<TPayload = unknown> = {
    amulet_rules: {
        contract: SpliceContract<TPayload>;
        domain_id: string;
    };
};

export type RelTimePayload = {
    microseconds: string;
};

export type IssuanceConfigPayload = {
    validatorRewardPercentage: string;
    unfeaturedAppRewardCap: string;
    appRewardPercentage: string;
    featuredAppRewardCap: string;
    amuletToIssuePerYear: string;
    validatorRewardCap: string;
    optValidatorFaucetCap: string;
};

export type TransferFeeStepPayload = {
    _1: string;
    _2: string;
};

export type TransferFeePayload = {
    initialRate: string;
    steps: TransferFeeStepPayload[];
};

export type TransferConfigUsdPayload = {
    holdingFee: { rate: string };
    extraFeaturedAppRewardAmount: string;
    maxNumInputs: string;
    lockHolderFee: { fee: string };
    createFee: { fee: string };
    maxNumLockHolders: string;
    transferFee: TransferFeePayload;
    maxNumOutputs: string;
};

export type RoundNumberPayload = {
    number: string;
};

export type OpenMiningRoundPayload = {
    dso: string;
    tickDuration: RelTimePayload;
    issuingFor: RelTimePayload;
    amuletPrice: string;
    issuanceConfig: IssuanceConfigPayload;
    opensAt: string;
    transferConfigUsd: TransferConfigUsdPayload;
    targetClosesAt: string;
    round: RoundNumberPayload;
};

export type IssuingMiningRoundPayload = {
    dso: string;
    optIssuancePerValidatorFaucetCoupon: string;
    issuancePerFeaturedAppRewardCoupon: string;
    opensAt: string;
    issuancePerSvRewardCoupon: string;
    targetClosesAt: string;
    issuancePerUnfeaturedAppRewardCoupon: string;
    round: RoundNumberPayload;
    issuancePerValidatorRewardCoupon: string;
};

export type MiningRoundsResponse = {
    open_mining_rounds: ContractWithDomain<OpenMiningRoundPayload>[];
    issuing_mining_rounds: ContractWithDomain<IssuingMiningRoundPayload>[];
};

export type FeaturedAppRightPayload = {
    dso: string;
    provider: string;
};

export type FeaturedAppRightResponse = {
    featured_app_right?: SpliceContract<FeaturedAppRightPayload>;
};

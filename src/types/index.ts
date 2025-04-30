type MapLink = {
  backward: number;
  forward: number;
  source: number;
  target: number;
};

export type Chain =
  | 'eth'
  | 'bsc'
  | 'ftm'
  | 'avax'
  | 'cro'
  | 'arbi'
  | 'poly'
  | 'base'
  | 'sol'
  | 'sonic';

export type MapData = {
  chain: Chain;
  dt_update: string;
  full_name: string;
  id: string;
  is_X721: boolean;
  links: MapLink[];
  metadata: {
    max_amount: number;
    min_amount: number;
  };
  nodes: {
    address: string;
    amount: number;
    is_contract: boolean;
    name: string;
    percentage: number;
    transaction_count: number;
    transfer_X721_count: number | null;
    transfer_count: number;
  }[];
  source_id: number;
  symbol: string;
  token_address: string;
  token_links: {
    address: string;
    decimal: number;
    links: MapLink[];
    name: string;
    symbol: string;
  }[];
  top_500: number;
  version: number;
};

export type MapMetadata = {
  decentralisation_score: number;
  dt_update: string;
  identified_supply: {
    percent_in_cexs: number;
    percent_in_contracts: number;
  };
  status: string;
  ts_update: number;
};

export type TokenSecurityAndRiskData = {
  [address: string]: {
    anti_whale_modifiable: '0' | '1';
    buy_tax: string;
    can_take_back_ownership: '0' | '1';
    cannot_buy: '0' | '1';
    cannot_sell_all: '0' | '1';
    creator_address: string;
    creator_balance: string;
    creator_percent: string;
    dex: Dex[];
    external_call: '0' | '1';
    hidden_owner: '0' | '1';
    holder_count: string;
    holders: Holder[];
    honeypot_with_same_creator: string;
    is_anti_whale: '0' | '1';
    is_blacklisted: '0' | '1';
    is_honeypot: '0' | '1';
    is_in_cex: {
      listed: '0' | '1';
      cex_list: string[];
    };
    is_in_dex: '0' | '1';
    is_mintable: '0' | '1';
    is_open_source: '0' | '1';
    is_proxy: '0' | '1';
    is_whitelisted: '0' | '1';
    lp_holder_count: string;
    lp_holders: LpHolder[];
    lp_total_supply: string;
    owner_address: string;
    owner_balance: string;
    owner_change_balance: '0' | '1';
    owner_percent: string;
    personal_slippage_modifiable: '0' | '1';
    selfdestruct: '0' | '1';
    sell_tax: string;
    slippage_modifiable: '0' | '1';
    token_name: string;
    token_symbol: string;
    total_supply: string;
    trading_cooldown: '0' | '1';
    transfer_pausable: '0' | '1';
    transfer_tax: string;
    trust_list: '1';
    fake_token?: {
      true_token_address: string;
      value: 0 | 1;
    };
    launchpad_token?: {
      is_launchpad_token: '0' | '1';
      launchpad_name: string;
    };
    other_potential_risks?: string;
    note?: string;
    is_airdrop_scam?: '0' | '1';
  };
};

type Holder = {
  address: string;
  tag: string;
  is_contract: number;
  balance: string;
  percent: string;
  is_locked: number;
};

type Dex = {
  liquidity_type: 'UniV2' | 'UniV3';
  name: 'UniswapV2' | 'UniswapV3' | 'SushiSwapV2';
  liquidity: string;
  pair: string;
};

type LpHolder = {
  address: string;
  tag: string;
  value: string;
  is_contract: 0;
  balance: string;
  percent: string;
  NFT_list: Nft[];
  is_locked: 0;
};

type Nft = {
  value: string;
  NFT_id: string;
  amount: string;
  in_effect: string;
  NFT_percentage: string;
};

export type SolanaTokenSecurityAndRiskData = {
  [address: string]: {
    balance_mutable_authority: {
      authority: string[];
      status: string;
    };
    closable: {
      authority: string[];
      status: string;
    };
    creators: string[];
    default_account_state: string;
    default_account_state_upgradable: {
      authority: string[];
      status: string;
    };
    dex: Array<{
      day: {
        price_max: string;
        price_min: string;
        volume: string;
      };
      dex_name: string;
      fee_rate: string;
      id: string;
      lp_amount: string;
      month: {
        price_max: string;
        price_min: string;
        volume: string;
      };
      open_time: string;
      price: string;
      tvl: string;
      type: string;
      week: {
        price_max: string;
        price_min: string;
        volume: string;
      };
    }>;
    freezable: {
      authority: string[];
      status: string;
    };
    holder_count: string;
    holders: Array<{
      account: string;
      balance: string;
      is_locked: number;
      locked_detail: any[];
      percent: string;
      tag: string;
      token_account: string;
    }>;
    lp_holders: Array<{
      account: string;
      balance: string;
      is_locked: number;
      locked_detail: any[];
      percent: string;
      tag: string;
      token_account: string;
    }>;
    metadata: {
      description: string;
      name: string;
      symbol: string;
      uri: string;
    };
    metadata_mutable: {
      metadata_upgrade_authority: Array<{
        address: string;
        malicious_address: number;
      }>;
      status: string;
    };
    mintable: {
      authority: string[];
      status: string;
    };
    non_transferable: string;
    total_supply: string;
    transfer_fee: Record<string, unknown>;
    transfer_fee_upgradable: {
      authority: string[];
      status: string;
    };
    transfer_hook: string[];
    transfer_hook_upgradable: {
      authority: string[];
      status: string;
    };
    trusted_token: number;
  };
};
export type RugPullAnalysis = {
  owner: {
    owner_name?: string;
    owner_address?: string;
    owner_type?: 'blackhole' | 'contract' | 'eoa' | 'multi-address' | null;
  };
  privilege_withdraw: -1 | 0 | 1;
  withdraw_missing: -1 | 0 | 1;
  is_open_source: 0 | 1;
  blacklist: -1 | 0 | 1;
  contract_name: string;
  selfdestruct: -1 | 0 | 1;
  is_proxy: 0 | 1;
  approval_abuse: -1 | 0 | 1;
};

export type GoPlusApiResponse<T> = {
  code: number;
  message: string;
  result: T;
};

export type MaliciousAnalysis = {
  cybercrime: '0' | '1';
  money_laundering: '0' | '1';
  number_of_malicious_contracts_created: string;
  gas_abuse: '0' | '1';
  financial_crime: '0' | '1';
  darkweb_transactions: '0' | '1';
  reinit: '0' | '1';
  phishing_activities: '0' | '1';
  contract_address: '0' | '1';
  fake_kyc: '0' | '1';
  blacklist_doubt: '0' | '1';
  fake_standard_interface: '0' | '1';
  data_source: string;
  stealing_attack: '0' | '1';
  blackmail_activities: '0' | '1';
  sanctioned: '0' | '1';
  malicious_mining_activities: '0' | '1';
  mixer: '0' | '1';
  fake_token: '0' | '1';
  honeypot_related_address: '0' | '1';
};

export type GeckoToken = {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    symbol: string;
    decimals: number;
    total_supply: string | null;
    coingecko_coin_id: string | null;
    price_usd: string | null;
    fdv_usd: string | null;
    total_reserve_in_usd: string | null;
    volume_usd?: any;
    market_cap_usd: string | null;
  };
  relationships: Record<string, unknown>;
};

// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect } from "react";
import LoginScreen from "./LoginScreen";
import MainScreen from "./MainScreen";
import { createLedgerContext } from "@daml/react";
import DamlHub, {
  damlHubLogout,
  isRunningOnHub,
  usePublicParty,
  usePublicToken,
} from "@daml/hub-react";
import Credentials, { PublicParty } from "../Credentials";
import { authConfig, Insecure } from "../config";
import Ledger from "@daml/ledger";

// Context for the party of the user.
export const userContext = createLedgerContext();
// Context for the public party used to query user aliases.
// On Daml hub, this is a separate context. Locally, we have a single
// token that has actAs claims for the user’s party and readAs claims for
// the public party so we reuse the user context.
export const publicContext = isRunningOnHub()
  ? createLedgerContext()
  : userContext;

/**
 * React component for the entry point into the application.
 */
// APP_BEGIN
const App: React.FC = () => {
  const [credentials, setCredentials] = React.useState<
    Credentials | undefined
  >();

  useEffect(() => {
    if (!credentials && authConfig.provider === "none") {
      const auth = authConfig as Insecure;
      const username = "Alice";
      const token = auth.makeToken(username);
      const ledger = new Ledger({ token });
      auth.userManagement.primaryParty(username, ledger).then(async primaryParty => {
        const publicParty = await auth.userManagement.publicParty(username, ledger);
        const getPublicParty = (): PublicParty => ({
          usePublicParty: () => publicParty,
          setup: () => {},
        });
        setCredentials({
          party: primaryParty,
          token,
          user: { userId: username, primaryParty },
          getPublicParty,
        });
      }).catch(console.error);
    }
  }, [credentials]);
  if (credentials) {
    const PublicPartyLedger: React.FC = ({ children }) => {
      const publicToken = usePublicToken();
      const publicParty = usePublicParty();
      if (publicToken && publicParty) {
        return (
          <publicContext.DamlLedger
            token={publicToken.token}
            party={publicParty}>
            {children}
          </publicContext.DamlLedger>
        );
      } else {
        return <h1>Loading ...</h1>;
      }
    };
    const Wrap: React.FC = ({ children }) =>
      isRunningOnHub() ? (
        <DamlHub token={credentials.token}>
          <PublicPartyLedger>{children}</PublicPartyLedger>
        </DamlHub>
      ) : (
        <div>{children}</div>
      );
    return (
      <Wrap>
        <userContext.DamlLedger
          token={credentials.token}
          party={credentials.party}
          user={credentials.user}>
          <MainScreen
            getPublicParty={credentials.getPublicParty}
            onLogout={() => {
              if (authConfig.provider === "daml-hub") {
                damlHubLogout();
              }
              setCredentials(undefined);
            }}
          />
        </userContext.DamlLedger>
      </Wrap>
    );
  } else {
    return <LoginScreen onLogin={setCredentials} />;
  }
};
// APP_END

export default App;

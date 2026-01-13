// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Container, Menu, Header } from 'semantic-ui-react';
import PartiesView from './PartiesView';
import SystemView from './SystemView';
import ClientsView from './ClientsView';
import VaultsView from './VaultsView';
import TransfersView from './TransfersView';

const MainView: React.FC = () => {
  const [activeItem, setActiveItem] = useState('system');

  const handleItemClick = (name: string) => setActiveItem(name);

  const renderActiveView = () => {
    switch (activeItem) {
      case 'parties':
        return <PartiesView />;
      case 'system':
        return <SystemView />;
      case 'clients':
        return <ClientsView />;
      case 'vaults':
        return <VaultsView />;
      case 'transfers':
        return <TransfersView />;
      default:
        return <SystemView />;
    }
  };

  return (
    <Container>
      <Header as='h1' size='huge' color='blue' textAlign='center' style={{padding: '1ex 0em 0ex 0em'}}>
        Asterizm Client Demo
      </Header>
      <Menu pointing secondary>
        <Menu.Item
          name='parties'
          active={activeItem === 'parties'}
          onClick={() => handleItemClick('parties')}
        >
          Parties
        </Menu.Item>
        <Menu.Item
          name='system'
          active={activeItem === 'system'}
          onClick={() => handleItemClick('system')}
        >
          System
        </Menu.Item>
        <Menu.Item
          name='clients'
          active={activeItem === 'clients'}
          onClick={() => handleItemClick('clients')}
        >
          Clients
        </Menu.Item>
        <Menu.Item
          name='vaults'
          active={activeItem === 'vaults'}
          onClick={() => handleItemClick('vaults')}
        >
          Vaults
        </Menu.Item>
        <Menu.Item
          name='transfers'
          active={activeItem === 'transfers'}
          onClick={() => handleItemClick('transfers')}
        >
          Transfers
        </Menu.Item>
      </Menu>
      {renderActiveView()}
    </Container>
  );
}

export default MainView;

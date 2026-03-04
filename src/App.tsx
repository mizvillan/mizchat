/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Layout } from './components/Layout';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Layout />
      </SocketProvider>
    </AuthProvider>
  );
}

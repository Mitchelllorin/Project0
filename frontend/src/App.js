import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { StudioProvider } from './studio/StudioContext';
import { ErrorBoundary } from './studio/ErrorBoundary';
import Studio from './studio/Studio';
import './App.css';

// The boundary is outside the provider on purpose. A crash inside the provider — which is
// exactly what a missing `crypto.randomUUID` was, on any plain-http address that was not
// localhost — could not be caught by a boundary *inside* it, so the page went empty with
// nothing on it and nothing to click. Outside, the same crash shows the recoverable screen
// that already exists. The screen uses no context, so it renders from out here too.
export default function App() {
  return <BrowserRouter><ErrorBoundary><StudioProvider><Studio /><Toaster theme="dark" position="bottom-right" /></StudioProvider></ErrorBoundary></BrowserRouter>;
}
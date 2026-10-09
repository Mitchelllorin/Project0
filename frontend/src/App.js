import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { StudioProvider } from './studio/StudioContext';
import Studio from './studio/Studio';
import './App.css';

export default function App() {
  return <BrowserRouter><StudioProvider><Studio /><Toaster theme="dark" position="bottom-right" /></StudioProvider></BrowserRouter>;
}
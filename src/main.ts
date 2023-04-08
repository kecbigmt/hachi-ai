import React from 'react';
import { createRoot } from 'react-dom/client'

import './style.css'
import { App } from './App'


const container = document.getElementById('app')
if (!container) throw new Error('No container found')

const root = createRoot(container)
const app = React.createElement(App)
root.render(app)

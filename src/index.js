import React from 'react'
import ReactDOM from 'react-dom'

import './styles.css'
import Notes from './Notes.js'

function App() {
  return (
    <div className="App">
      <h1>Notes</h1>
      <Notes />
    </div>
  )
}

const rootElement = document.getElementById('root')
ReactDOM.render(<App />, rootElement)

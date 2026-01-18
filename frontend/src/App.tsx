import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PPT Copilot</h1>
        <p className="text-gray-600 mb-4">AI 原生 PPT 生成助手</p>
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Count is {count}
        </button>
      </div>
    </div>
  )
}

export default App

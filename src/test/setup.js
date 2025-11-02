// Este import estende o "expect" do Vitest com funções úteis
// como .toBeInTheDocument(), .toHaveClass(), etc.
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Isso garante que a tela simulada (JSDOM) seja limpa
// após cada teste, evitando que um teste afete o outro.
afterEach(() => {
  cleanup()
})
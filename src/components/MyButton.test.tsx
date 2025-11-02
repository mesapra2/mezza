import { render, screen, fireEvent } from '@testing-library/react'
import MyButton from './MyButton'

describe('MyButton', () => {
  it('renderiza corretamente', () => {
    render(<MyButton label="Enviar" />)
    expect(screen.getByText('Enviar')).toBeInTheDocument()
  })

  it('dispara o evento de clique', () => {
    const onClick = vi.fn()
    render(<MyButton label="Enviar" onClick={onClick} />)
    fireEvent.click(screen.getByText('Enviar'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

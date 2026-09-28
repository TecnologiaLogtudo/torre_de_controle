import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Toaster, toast } from '@/components/feedback/Toaster'

describe('Sistema de Feedback e Notificações (Toaster Logtudo)', () => {
  it('deve renderizar o container Toaster no documento sem erros', () => {
    const { container } = render(<Toaster />)
    expect(container).toBeDefined()
  })

  it('deve disparar toast.success e renderizar o elemento de notificação', async () => {
    render(
      <div>
        <Toaster />
        <button onClick={() => toast.success('Agendamento criado com sucesso!')}>
          Disparar
        </button>
      </div>
    )

    const btn = screen.getByRole('button', { name: 'Disparar' })
    act(() => {
      btn.click()
    })

    const toastElement = await screen.findByText('Agendamento criado com sucesso!')
    expect(toastElement).toBeInTheDocument()
  })

  it('deve disparar toast.error com descrição de regra operacional', async () => {
    render(
      <div>
        <Toaster />
        <button
          onClick={() =>
            toast.error('Erro de validação', {
              description: 'Veículo incompatível com a capacidade contratada.',
            })
          }
        >
          Disparar Erro
        </button>
      </div>
    )

    const btn = screen.getByRole('button', { name: 'Disparar Erro' })
    act(() => {
      btn.click()
    })

    const title = await screen.findByText('Erro de validação')
    const desc = await screen.findByText('Veículo incompatível com a capacidade contratada.')
    expect(title).toBeInTheDocument()
    expect(desc).toBeInTheDocument()
  })
})

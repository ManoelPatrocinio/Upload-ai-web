import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { api } from '@/lib/axios'

interface Prompt {
  id: string
  title: string
  template: string
}

interface PromptSelectProps {
  onPromptSelect: (template: string) => void
}

export function PromptSelect({ onPromptSelect }: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)

  function handlePromptSelect(promptId: string) {
    const selectedPrompt = prompts?.find(prompt => prompt.id === promptId)

    if (!selectedPrompt) return

    onPromptSelect(selectedPrompt.template)
  }

  useEffect(() => {
    api.get('/prompts').then(({ data }) => {
      setPrompts(data)
    })
  }, [])

  return (
    <Select onValueChange={handlePromptSelect}>
      <SelectTrigger id="prompt">
        <SelectValue placeholder="Selecione um prompt..." />
      </SelectTrigger>
      <SelectContent>
        {prompts?.map(item => (
          <SelectItem key={item.id} value={item.id}>
            {item.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAiChatStore = defineStore('aiChat', () => {
  const isOpen = ref(false)
  const messages = ref<{ role: 'user' | 'ai', text: string }[]>([])
  const hasInitialized = ref(false)
  const currentProject = ref<any>(null)

  function setProject(project: any) {
    currentProject.value = project
    if (project?.name) {
      init(project.name)
    }
  }

  function init(projectName: string) {
    if (hasInitialized.value) return
    messages.value = [
      { role: 'ai', text: `Olá! Sou o assistente virtual do ${projectName}. Como posso te ajudar hoje?` }
    ]
    hasInitialized.value = true
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function addMessage(role: 'user' | 'ai', text: string) {
    messages.value.push({ role, text })
  }

  function clear() {
    messages.value = []
    hasInitialized.value = false
  }

  function hasConversation(): boolean {
    return messages.value.length > 1
  }

  function getTranscript(): string | null {
    if (!hasConversation()) return null
    return JSON.stringify(messages.value)
  }

  return {
    isOpen,
    messages,
    currentProject,
    setProject,
    init,
    toggle,
    addMessage,
    clear,
    hasConversation,
    getTranscript
  }
})

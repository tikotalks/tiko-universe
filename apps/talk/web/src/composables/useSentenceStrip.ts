import { computed, ref } from 'vue'
import type { SavedPhrase, Template, WordTile } from '@tiko/talk-types'

export interface SentenceStripOptions {
  allWords: WordTile[]
}

export function useSentenceStrip(options: SentenceStripOptions) {
  const words = ref<WordTile[]>([])

  const display = computed(() => words.value.map((word) => word.text).join(' '))
  const wordIds = computed(() => words.value.map((word) => word.id))
  const canSpeak = computed(() => words.value.length > 0)

  function addWord(word: WordTile) {
    words.value = [...words.value, word]
  }

  function removeWord(index: number) {
    if (index < 0 || index >= words.value.length) return
    words.value = words.value.filter((_, currentIndex) => currentIndex !== index)
  }

  function moveWord(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= words.value.length) return
    if (toIndex < 0 || toIndex >= words.value.length) return
    if (fromIndex === toIndex) return

    const next = [...words.value]
    const [word] = next.splice(fromIndex, 1)
    if (!word) return
    next.splice(toIndex, 0, word)
    words.value = next
  }

  function clear() {
    words.value = []
  }

  function setWords(nextWords: WordTile[]) {
    words.value = [...nextWords]
  }

  function applyPhrase(phrase: SavedPhrase) {
    const byId = new Map(options.allWords.map((word) => [word.id, word]))
    setWords(phrase.wordIds.map((id) => byId.get(id)).filter((word): word is WordTile => Boolean(word)))
  }

  function applyTemplate(template: Template) {
    const fixedWords = template.pattern
      .split(' ')
      .filter((part) => part !== '___' && !part.startsWith('['))
      .map((part) => options.allWords.find((word) => word.text.toLowerCase() === part.toLowerCase()))
      .filter((word): word is WordTile => Boolean(word))

    setWords(fixedWords)
  }

  return {
    words,
    display,
    wordIds,
    canSpeak,
    addWord,
    removeWord,
    moveWord,
    clear,
    setWords,
    applyPhrase,
    applyTemplate,
  }
}

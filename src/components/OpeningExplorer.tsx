// src/components/OpeningExplorer.tsx
import React, {useState, useEffect} from 'react'
import {ChessOpening, ChessChapter, ChessVariant} from '../types/chess'
import {saveOpenings, loadOpenings} from '../storage/chessStorage'
import ChessboardComponent from './Chessboard'
import {TrashIcon, PencilIcon} from 'lucide-react'

const OpeningExplorer: React.FC = () => {
  const [openings, setOpenings] = useState<ChessOpening[]>([])
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [currentPgn, setCurrentPgn] = useState<string>('')

  // Laden der Daten beim Start
  useEffect(() => {
    console.log('Loading data from localStorage')
    const savedOpenings = loadOpenings()
    if (savedOpenings.length > 0) {
      setOpenings(savedOpenings)
    }
  }, [])

  // Speichern bei Änderungen
  useEffect(() => {
    console.log('Saving data to localStorage')
    if (openings.length > 0) {
      saveOpenings(openings)
    }
  }, [openings])

  // Setzen der Openings mit Storage
  const updateOpenings = (newOpenings: ChessOpening[]) => {
    setOpenings(newOpenings)
    saveOpenings(newOpenings)
  }
  //   // LocalStorage Effekte
  //   useEffect(() => {
  //     const savedData = localStorage.getItem('chessOpenings')
  //     if (savedData) {
  //       setOpenings(JSON.parse(savedData))
  //     }
  //   }, [])

  //   useEffect(() => {
  //     localStorage.setItem('chessOpenings', JSON.stringify(openings))
  //   }, [openings])

  // Verwaltungsfunktionen für Eröffnungen
  const addOpening = () => {
    const name = prompt('Name der neuen Eröffnung:')
    if (name) {
      const newOpening: ChessOpening = {
        id: crypto.randomUUID(),
        name,
        chapters: [],
      }
      const newOpenings = [...openings, newOpening]
      updateOpenings(newOpenings)
    }
  }

  const renameOpening = (openingId: string, currentName: string) => {
    const newName = prompt('Neuer Name für die Eröffnung:', currentName)
    if (newName) {
      setOpenings(openings.map(opening => (opening.id === openingId ? {...opening, name: newName} : opening)))
    }
  }

  const deleteOpening = (openingId: string) => {
    if (window.confirm('Möchten Sie diese Eröffnung wirklich löschen?')) {
      setOpenings(openings.filter(opening => opening.id !== openingId))
      if (selectedOpening === openingId) {
        setSelectedOpening(null)
        setSelectedChapter(null)
        setSelectedVariant(null)
      }
    }
  }

  // Verwaltungsfunktionen für Kapitel
  const addChapter = (openingId: string) => {
    const name = prompt('Name des neuen Kapitels:')
    if (name) {
      const newOpenings = openings.map(opening => {
        if (opening.id === openingId) {
          return {
            ...opening,
            chapters: [
              ...opening.chapters,
              {
                id: crypto.randomUUID(),
                name,
                variants: [],
              },
            ],
          }
        }
        return opening
      })
      updateOpenings(newOpenings)
    }
  }
  const renameChapter = (openingId: string, chapterId: string, currentName: string) => {
    const newName = prompt('Neuer Name für das Kapitel:', currentName)
    if (newName) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map(chapter => (chapter.id === chapterId ? {...chapter, name: newName} : chapter)),
            }
          }
          return opening
        }),
      )
    }
  }

  const deleteChapter = (openingId: string, chapterId: string) => {
    if (window.confirm('Möchten Sie dieses Kapitel wirklich löschen?')) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.filter(chapter => chapter.id !== chapterId),
            }
          }
          return opening
        }),
      )
      if (selectedChapter === chapterId) {
        setSelectedChapter(null)
        setSelectedVariant(null)
      }
    }
  }

  // Verwaltungsfunktionen für Varianten
  const addVariant = (openingId: string, chapterId: string, pgn: string) => {
    const name = prompt('Name der neuen Variante:')
    if (name) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map(chapter => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: [
                      ...chapter.variants,
                      {
                        id: crypto.randomUUID(),
                        name,
                        pgn,
                      },
                    ],
                  }
                }
                return chapter
              }),
            }
          }
          return opening
        }),
      )
    }
  }

  const renameVariant = (openingId: string, chapterId: string, variantId: string, currentName: string) => {
    const newName = prompt('Neuer Name für die Variante:', currentName)
    if (newName) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map(chapter => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: chapter.variants.map(variant => (variant.id === variantId ? {...variant, name: newName} : variant)),
                  }
                }
                return chapter
              }),
            }
          }
          return opening
        }),
      )
    }
  }

  const deleteVariant = (openingId: string, chapterId: string, variantId: string) => {
    if (window.confirm('Möchten Sie diese Variante wirklich löschen?')) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map(chapter => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: chapter.variants.filter(variant => variant.id !== variantId),
                  }
                }
                return chapter
              }),
            }
          }
          return opening
        }),
      )
      if (selectedVariant === variantId) {
        setSelectedVariant(null)
      }
    }
  }

  // PGN Handling
  const handlePgnChange = (pgn: string) => {
    setCurrentPgn(pgn)

    if (selectedOpening && selectedChapter && selectedVariant) {
      setOpenings(
        openings.map(opening => {
          if (opening.id === selectedOpening) {
            return {
              ...opening,
              chapters: opening.chapters.map(chapter => {
                if (chapter.id === selectedChapter) {
                  return {
                    ...chapter,
                    variants: chapter.variants.map(variant => {
                      if (variant.id === selectedVariant) {
                        return {...variant, pgn}
                      }
                      return variant
                    }),
                  }
                }
                return chapter
              }),
            }
          }
          return opening
        }),
      )
    }
  }

  const getCurrentVariant = () => {
    if (!selectedOpening || !selectedChapter || !selectedVariant) return null

    const opening = openings.find(o => o.id === selectedOpening)
    if (!opening) return null

    const chapter = opening.chapters.find(c => c.id === selectedChapter)
    if (!chapter) return null

    const variant = chapter.variants.find(v => v.id === selectedVariant)
    return variant || null
  }

  return (
    <div className='flex h-screen'>
      <div className='w-64 bg-gray-100 p-4 overflow-y-auto'>
        <button onClick={addOpening} className='w-full mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
          Neue Eröffnung
        </button>

        {openings.map(opening => (
          <div key={opening.id} className='mb-4'>
            <div className={`flex items-center p-2 cursor-pointer ${selectedOpening === opening.id ? 'bg-blue-100' : ''}`}>
              <div className='flex-grow' onClick={() => setSelectedOpening(opening.id)}>
                <span className='font-bold'>{opening.name}</span>
              </div>
              <div className='flex space-x-2'>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    addChapter(opening.id)
                  }}
                  className='text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600'>
                  + Kapitel
                </button>
                <PencilIcon className='w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer' onClick={() => renameOpening(opening.id, opening.name)} />
                <TrashIcon className='w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer' onClick={() => deleteOpening(opening.id)} />
              </div>
            </div>

            {selectedOpening === opening.id &&
              opening.chapters.map(chapter => (
                <div key={chapter.id} className='ml-4 mt-2'>
                  <div className={`flex items-center p-2 cursor-pointer ${selectedChapter === chapter.id ? 'bg-green-100' : ''}`}>
                    <div className='flex-grow' onClick={() => setSelectedChapter(chapter.id)}>
                      <span>{chapter.name}</span>
                    </div>
                    <div className='flex space-x-2'>
                      <button onClick={() => addVariant(opening.id, chapter.id, currentPgn)} className='text-sm bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600'>
                        + Variante
                      </button>
                      <PencilIcon className='w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer' onClick={() => renameChapter(opening.id, chapter.id, chapter.name)} />
                      <TrashIcon className='w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer' onClick={() => deleteChapter(opening.id, chapter.id)} />
                    </div>
                  </div>

                  {selectedChapter === chapter.id &&
                    chapter.variants.map(variant => (
                      <div key={variant.id} className={`flex items-center ml-4 p-2 cursor-pointer ${selectedVariant === variant.id ? 'bg-purple-100' : ''}`}>
                        <div className='flex-grow' onClick={() => setSelectedVariant(variant.id)}>
                          {variant.name}
                        </div>
                        <div className='flex space-x-2'>
                          <PencilIcon className='w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer' onClick={() => renameVariant(opening.id, chapter.id, variant.id, variant.name)} />
                          <TrashIcon className='w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer' onClick={() => deleteVariant(opening.id, chapter.id, variant.id)} />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className='flex-1'>
        <ChessboardComponent initialPgn={getCurrentVariant()?.pgn || ''} onPgnChange={handlePgnChange} />
      </div>
    </div>
  )
}

export default OpeningExplorer

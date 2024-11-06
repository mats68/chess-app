// src/components/OpeningExplorer.tsx
import React, {useState, useEffect} from 'react'
import {DragDropContext, Droppable, Draggable, DropResult} from 'react-beautiful-dnd'
import {ChessOpening, ChessChapter, ChessVariant} from '../types/chess'
import {saveOpenings, loadOpenings} from '../storage/chessStorage'
import ChessboardComponent from './Chessboard'
import DatabaseControls from './DatabaseControls'
import {TrashIcon, PencilIcon, GripVertical} from 'lucide-react'

const OpeningExplorer: React.FC = () => {
  const [openings, setOpenings] = useState<ChessOpening[]>([])
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [currentPgn, setCurrentPgn] = useState<string>('')

  // Laden der Daten beim Start
  useEffect(() => {
    const savedOpenings = loadOpenings()
    if (savedOpenings.length > 0) {
      setOpenings(savedOpenings)
    }
  }, [])

  // Speichern bei Änderungen
  useEffect(() => {
    if (openings.length > 0) {
      saveOpenings(openings)
    }
  }, [openings])

  const handleDragEnd = (result: DropResult) => {
    const {source, destination, type} = result

    // Wenn kein Ziel oder gleiche Position, nichts tun
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return
    }

    const newOpenings = [...openings]

    switch (type) {
      case 'OPENING':
        // Neuordnung von Eröffnungen
        const [movedOpening] = newOpenings.splice(source.index, 1)
        newOpenings.splice(destination.index, 0, movedOpening)
        setOpenings(newOpenings)
        break

      case 'CHAPTER':
        // Neuordnung von Kapiteln innerhalb einer Eröffnung
        const openingId = source.droppableId.split('-')[1]
        const opening = newOpenings.find(o => o.id === openingId)
        if (opening) {
          const newChapters = [...opening.chapters]
          const [movedChapter] = newChapters.splice(source.index, 1)
          newChapters.splice(destination.index, 0, movedChapter)
          opening.chapters = newChapters
          setOpenings([...newOpenings])
        }
        break

      case 'VARIANT':
        // Neuordnung von Varianten innerhalb eines Kapitels
        const [openId, chapId] = source.droppableId.split('-').slice(1)
        const targetOpening = newOpenings.find(o => o.id === openId)
        if (targetOpening) {
          const targetChapter = targetOpening.chapters.find(c => c.id === chapId)
          if (targetChapter) {
            const newVariants = [...targetChapter.variants]
            const [movedVariant] = newVariants.splice(source.index, 1)
            newVariants.splice(destination.index, 0, movedVariant)
            targetChapter.variants = newVariants
            setOpenings([...newOpenings])
          }
        }
        break
    }
  }

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

  const handleDatabaseImport = (importedOpenings: ChessOpening[]) => {
    if (window.confirm('Möchten Sie die aktuelle Datenbank durch die importierte ersetzen?')) {
      setOpenings(importedOpenings)
      // Reset selections
      setSelectedOpening(null)
      setSelectedChapter(null)
      setSelectedVariant(null)
    }
  }

  return (
    <div className='flex flex-col h-screen'>
      <div className='p-4 bg-white border-b'>
        <DatabaseControls openings={openings} onImport={handleDatabaseImport} />
      </div>

      <div className='flex flex-1 overflow-hidden'>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className='w-64 bg-gray-100 p-4 overflow-y-auto'>
            <button onClick={addOpening} className='w-full mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
              Neue Eröffnung
            </button>

            <Droppable droppableId='openings' type='OPENING'>
              {provided => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {openings.map((opening, index) => (
                    <Draggable key={opening.id} draggableId={opening.id} index={index}>
                      {provided => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className='mb-4'>
                          <div className={`flex items-center p-2 cursor-pointer ${selectedOpening === opening.id ? 'bg-blue-100' : ''}`}>
                            <div {...provided.dragHandleProps} className='mr-2'>
                              <GripVertical className='w-4 h-4 text-gray-400' />
                            </div>
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

                          {selectedOpening === opening.id && (
                            <Droppable droppableId={`chapters-${opening.id}`} type='CHAPTER'>
                              {provided => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className='ml-4'>
                                  {opening.chapters.map((chapter, chapterIndex) => (
                                    <Draggable key={chapter.id} draggableId={chapter.id} index={chapterIndex}>
                                      {provided => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} className='mt-2'>
                                          <div className={`flex items-center p-2 ${selectedChapter === chapter.id ? 'bg-green-100' : ''}`}>
                                            <div {...provided.dragHandleProps} className='mr-2'>
                                              <GripVertical className='w-4 h-4 text-gray-400' />
                                            </div>
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

                                          {selectedChapter === chapter.id && (
                                            <Droppable droppableId={`variants-${opening.id}-${chapter.id}`} type='VARIANT'>
                                              {provided => (
                                                <div ref={provided.innerRef} {...provided.droppableProps} className='ml-4'>
                                                  {chapter.variants.map((variant, variantIndex) => (
                                                    <Draggable key={variant.id} draggableId={variant.id} index={variantIndex}>
                                                      {provided => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} className={`flex items-center p-2 ${selectedVariant === variant.id ? 'bg-purple-100' : ''}`}>
                                                          <div {...provided.dragHandleProps} className='mr-2'>
                                                            <GripVertical className='w-4 h-4 text-gray-400' />
                                                          </div>
                                                          <div className='flex-grow' onClick={() => setSelectedVariant(variant.id)}>
                                                            {variant.name}
                                                          </div>
                                                          <div className='flex space-x-2'>
                                                            <PencilIcon className='w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer' onClick={() => renameVariant(opening.id, chapter.id, variant.id, variant.name)} />
                                                            <TrashIcon className='w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer' onClick={() => deleteVariant(opening.id, chapter.id, variant.id)} />
                                                          </div>
                                                        </div>
                                                      )}
                                                    </Draggable>
                                                  ))}
                                                  {provided.placeholder}
                                                </div>
                                              )}
                                            </Droppable>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className='flex-1'>
            <ChessboardComponent initialPgn={getCurrentVariant()?.pgn || ''} onPgnChange={handlePgnChange} />
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}

export default OpeningExplorer

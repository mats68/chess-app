// src/components/OpeningExplorer.tsx
import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { ChessOpening, ChessChapter, ChessVariant } from "../types/chess";
import { saveOpenings, loadOpenings } from "../storage/chessStorage";
import ChessboardComponent from "./Chessboard";
import DatabaseControls from "./DatabaseControls";
import { TrashIcon, PencilIcon, GripVertical } from "lucide-react";
import { Chess } from "chess.js";

type ViewMode = "tree" | "board";

interface SelectedPath {
  openingName: string;
  chapterName: string;
  variantName: string;
}

const OpeningExplorer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [openings, setOpenings] = useState<ChessOpening[]>([]);
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null);

  const [currentPgn, setCurrentPgn] = useState<string>("");

  // Laden der Daten beim Start
  useEffect(() => {
    const savedOpenings = loadOpenings();
    if (savedOpenings.length > 0) {
      setOpenings(savedOpenings);
    }
  }, []);

  useEffect(() => {
    const chess = new Chess();
    setCurrentPgn(chess.pgn());
  }, []);

  // Speichern bei Änderungen
  useEffect(() => {
    if (openings.length > 0) {
      saveOpenings(openings);
    }
  }, [openings]);

  // Update currentPgn when a variant is selected
  useEffect(() => {
    if (selectedVariant) {
      const opening = openings.find((o) => o.id === selectedOpening);
      const chapter = opening?.chapters.find((c) => c.id === selectedChapter);
      const variant = chapter?.variants.find((v) => v.id === selectedVariant);
      if (variant) {
        setCurrentPgn(variant.pgn);
      }
    }
  }, [selectedVariant, openings, selectedOpening, selectedChapter]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    // Wenn kein Ziel oder gleiche Position, nichts tun
    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    const newOpenings = [...openings];

    switch (type) {
      case "OPENING":
        // Neuordnung von Eröffnungen
        const [movedOpening] = newOpenings.splice(source.index, 1);
        newOpenings.splice(destination.index, 0, movedOpening);
        setOpenings(newOpenings);
        break;

      case "CHAPTER":
        // Neuordnung von Kapiteln innerhalb einer Eröffnung
        const openingId = source.droppableId.split("-")[1];
        const opening = newOpenings.find((o) => o.id === openingId);
        if (opening) {
          const newChapters = [...opening.chapters];
          const [movedChapter] = newChapters.splice(source.index, 1);
          newChapters.splice(destination.index, 0, movedChapter);
          opening.chapters = newChapters;
          setOpenings([...newOpenings]);
        }
        break;

      case "VARIANT":
        // Neuordnung von Varianten innerhalb eines Kapitels
        const [openId, chapId] = source.droppableId.split("-").slice(1);
        const targetOpening = newOpenings.find((o) => o.id === openId);
        if (targetOpening) {
          const targetChapter = targetOpening.chapters.find(
            (c) => c.id === chapId
          );
          if (targetChapter) {
            const newVariants = [...targetChapter.variants];
            const [movedVariant] = newVariants.splice(source.index, 1);
            newVariants.splice(destination.index, 0, movedVariant);
            targetChapter.variants = newVariants;
            setOpenings([...newOpenings]);
          }
        }
        break;
    }
  };

  const handleSave = (pgn: string) => {
    if (selectedOpening && selectedChapter && selectedVariant) {
      const newOpenings = openings.map((opening) => {
        if (opening.id === selectedOpening) {
          return {
            ...opening,
            chapters: opening.chapters.map((chapter) => {
              if (chapter.id === selectedChapter) {
                return {
                  ...chapter,
                  variants: chapter.variants.map((variant) => {
                    if (variant.id === selectedVariant) {
                      return { ...variant, pgn };
                    }
                    return variant;
                  }),
                };
              }
              return chapter;
            }),
          };
        }
        return opening;
      });

      setOpenings(newOpenings);
      saveOpenings(newOpenings); // Explizit speichern in localStorage
    }
  };

  const handleBack = () => {
    setViewMode("tree");
    setSelectedVariant(null);
    setSelectedPath(null);
  };

  // Setzen der Openings mit Storage
  const updateOpenings = (newOpenings: ChessOpening[]) => {
    setOpenings(newOpenings);
    saveOpenings(newOpenings);
  };

  // Verwaltungsfunktionen für Eröffnungen
  const addOpening = () => {
    const name = prompt("Name der neuen Eröffnung:");
    if (name) {
      const newOpening: ChessOpening = {
        id: crypto.randomUUID(),
        name,
        chapters: [],
      };
      setOpenings([...openings, newOpening]);
    }
  };

  const renameOpening = (openingId: string, currentName: string) => {
    const newName = prompt("Neuer Name für die Eröffnung:", currentName);
    if (newName) {
      setOpenings(
        openings.map((opening) =>
          opening.id === openingId ? { ...opening, name: newName } : opening
        )
      );
    }
  };

  const deleteOpening = (openingId: string) => {
    if (window.confirm("Möchten Sie diese Eröffnung wirklich löschen?")) {
      setOpenings(openings.filter((opening) => opening.id !== openingId));
      if (selectedOpening === openingId) {
        setSelectedOpening(null);
        setSelectedChapter(null);
        setSelectedVariant(null);
      }
    }
  };

  // Verwaltungsfunktionen für Kapitel
  const addChapter = (openingId: string) => {
    const name = prompt("Name des neuen Kapitels:");
    if (name) {
      const newOpenings = openings.map((opening) => {
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
          };
        }
        return opening;
      });
      updateOpenings(newOpenings);
    }
  };
  const renameChapter = (
    openingId: string,
    chapterId: string,
    currentName: string
  ) => {
    const newName = prompt("Neuer Name für das Kapitel:", currentName);
    if (newName) {
      setOpenings(
        openings.map((opening) => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map((chapter) =>
                chapter.id === chapterId
                  ? { ...chapter, name: newName }
                  : chapter
              ),
            };
          }
          return opening;
        })
      );
    }
  };

  const deleteChapter = (openingId: string, chapterId: string) => {
    if (window.confirm("Möchten Sie dieses Kapitel wirklich löschen?")) {
      setOpenings(
        openings.map((opening) => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.filter(
                (chapter) => chapter.id !== chapterId
              ),
            };
          }
          return opening;
        })
      );
      if (selectedChapter === chapterId) {
        setSelectedChapter(null);
        setSelectedVariant(null);
      }
    }
  };

  // Update addVariant function to use currentPgn
  const addVariant = (openingId: string, chapterId: string) => {
    const name = prompt("Name der neuen Variante:");
    if (name) {
      setOpenings(
        openings.map((opening) => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map((chapter) => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: [
                      ...chapter.variants,
                      {
                        id: crypto.randomUUID(),
                        name,
                        pgn: currentPgn || "", // Use currentPgn here
                      },
                    ],
                  };
                }
                return chapter;
              }),
            };
          }
          return opening;
        })
      );
    }
  };

  // Add handler for PGN updates
  const handlePgnUpdate = (pgn: string) => {
    setCurrentPgn(pgn);
  };

  const renameVariant = (
    openingId: string,
    chapterId: string,
    variantId: string,
    currentName: string
  ) => {
    const newName = prompt("Neuer Name für die Variante:", currentName);
    if (newName) {
      setOpenings(
        openings.map((opening) => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map((chapter) => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: chapter.variants.map((variant) =>
                      variant.id === variantId
                        ? { ...variant, name: newName }
                        : variant
                    ),
                  };
                }
                return chapter;
              }),
            };
          }
          return opening;
        })
      );
    }
  };

  const deleteVariant = (
    openingId: string,
    chapterId: string,
    variantId: string
  ) => {
    if (window.confirm("Möchten Sie diese Variante wirklich löschen?")) {
      setOpenings(
        openings.map((opening) => {
          if (opening.id === openingId) {
            return {
              ...opening,
              chapters: opening.chapters.map((chapter) => {
                if (chapter.id === chapterId) {
                  return {
                    ...chapter,
                    variants: chapter.variants.filter(
                      (variant) => variant.id !== variantId
                    ),
                  };
                }
                return chapter;
              }),
            };
          }
          return opening;
        })
      );
      if (selectedVariant === variantId) {
        setSelectedVariant(null);
      }
    }
  };

  // PGN Handling
  const handlePgnChange = (pgn: string) => {
    // Verzögere das Update
    setTimeout(() => {
      if (selectedOpening && selectedChapter && selectedVariant) {
        setOpenings(
          openings.map((opening) => {
            if (opening.id === selectedOpening) {
              return {
                ...opening,
                chapters: opening.chapters.map((chapter) => {
                  if (chapter.id === selectedChapter) {
                    return {
                      ...chapter,
                      variants: chapter.variants.map((variant) => {
                        if (variant.id === selectedVariant) {
                          return { ...variant, pgn };
                        }
                        return variant;
                      }),
                    };
                  }
                  return chapter;
                }),
              };
            }
            return opening;
          })
        );
      }
    }, 0);
  };

  const getCurrentVariant = (): ChessVariant | null => {
    if (!selectedOpening || !selectedChapter || !selectedVariant) return null;

    const opening = openings.find((o) => o.id === selectedOpening);
    if (!opening) return null;

    const chapter = opening.chapters.find((c) => c.id === selectedChapter);
    if (!chapter) return null;

    return chapter.variants.find((v) => v.id === selectedVariant) || null;
  };

  const handleDatabaseImport = (importedOpenings: ChessOpening[]) => {
    if (
      window.confirm(
        "Möchten Sie die aktuelle Datenbank durch die importierte ersetzen?"
      )
    ) {
      setOpenings(importedOpenings);
      setSelectedOpening(null);
      setSelectedChapter(null);
      setSelectedVariant(null);
      setSelectedPath(null);
      setViewMode("tree");
    }
  };

  const handleVariantClick = (
    variant: ChessVariant,
    openingName: string,
    chapterName: string
  ) => {
    setSelectedVariant(variant.id);
    setSelectedPath({
      openingName,
      chapterName,
      variantName: variant.name,
    });
    setViewMode("board");
  };

  const handleBackToTree = () => {
    setViewMode("tree");
  };

  const TreeView = () => (
    <div className="w-full p-4">
      <div className="mb-4 flex justify-between">
        <DatabaseControls openings={openings} onImport={handleDatabaseImport} />
        <button
          onClick={addOpening}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + Neue Eröffnung
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="openings" type="OPENING">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {openings.map((opening, index) => (
                <Draggable
                  key={opening.id}
                  draggableId={opening.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="mb-4 bg-white rounded-lg shadow"
                    >
                      <div
                        className={`flex items-center p-3 border-b ${
                          selectedOpening === opening.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="mr-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <div
                          className="flex-grow cursor-pointer"
                          onClick={() =>
                            setSelectedOpening(
                              selectedOpening === opening.id ? null : opening.id
                            )
                          }
                        >
                          <span className="font-bold">{opening.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addChapter(opening.id);
                            }}
                            className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            + Kapitel
                          </button>
                          <PencilIcon
                            className="w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer"
                            onClick={() =>
                              renameOpening(opening.id, opening.name)
                            }
                          />
                          <TrashIcon
                            className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer"
                            onClick={() => deleteOpening(opening.id)}
                          />
                        </div>
                      </div>

                      {selectedOpening === opening.id && (
                        <div className="p-2">
                          <Droppable
                            droppableId={`chapters-${opening.id}`}
                            type="CHAPTER"
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {opening.chapters.map(
                                  (chapter, chapterIndex) => (
                                    <Draggable
                                      key={chapter.id}
                                      draggableId={chapter.id}
                                      index={chapterIndex}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className="ml-4 mt-2 bg-gray-50 rounded"
                                        >
                                          <div
                                            className={`flex items-center p-2 ${
                                              selectedChapter === chapter.id
                                                ? "bg-green-50"
                                                : ""
                                            }`}
                                          >
                                            <div
                                              {...provided.dragHandleProps}
                                              className="mr-2"
                                            >
                                              <GripVertical className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div
                                              className="flex-grow cursor-pointer"
                                              onClick={() =>
                                                setSelectedChapter(
                                                  selectedChapter === chapter.id
                                                    ? null
                                                    : chapter.id
                                                )
                                              }
                                            >
                                              {chapter.name}
                                            </div>
                                            <div className="flex space-x-2">
                                              <button
                                                onClick={() =>
                                                  addVariant(
                                                    opening.id,
                                                    chapter.id,
                                                    currentPgn
                                                  )
                                                }
                                                className="text-sm bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                                              >
                                                + Variante
                                              </button>
                                              <PencilIcon
                                                className="w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer"
                                                onClick={() =>
                                                  renameChapter(
                                                    opening.id,
                                                    chapter.id,
                                                    chapter.name
                                                  )
                                                }
                                              />
                                              <TrashIcon
                                                className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer"
                                                onClick={() =>
                                                  deleteChapter(
                                                    opening.id,
                                                    chapter.id
                                                  )
                                                }
                                              />
                                            </div>
                                          </div>

                                          {selectedChapter === chapter.id && (
                                            <Droppable
                                              droppableId={`variants-${opening.id}-${chapter.id}`}
                                              type="VARIANT"
                                            >
                                              {(provided) => (
                                                <div
                                                  ref={provided.innerRef}
                                                  {...provided.droppableProps}
                                                  className="ml-8 my-2"
                                                >
                                                  {chapter.variants.map(
                                                    (variant, variantIndex) => (
                                                      <Draggable
                                                        key={variant.id}
                                                        draggableId={variant.id}
                                                        index={variantIndex}
                                                      >
                                                        {(provided) => (
                                                          <div
                                                            ref={
                                                              provided.innerRef
                                                            }
                                                            {...provided.draggableProps}
                                                            className={`flex items-center p-2 mb-1 rounded cursor-pointer
                                                          hover:bg-purple-50 ${
                                                            selectedVariant ===
                                                            variant.id
                                                              ? "bg-purple-100"
                                                              : "bg-white"
                                                          }`}
                                                            onClick={() =>
                                                              handleVariantClick(
                                                                variant,
                                                                opening.name,
                                                                chapter.name
                                                              )
                                                            }
                                                          >
                                                            <div
                                                              {...provided.dragHandleProps}
                                                              className="mr-2"
                                                            >
                                                              <GripVertical className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <span className="flex-grow">
                                                              {variant.name}
                                                            </span>
                                                            <div className="flex space-x-2">
                                                              <PencilIcon
                                                                className="w-5 h-5 text-gray-600 hover:text-gray-800"
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  renameVariant(
                                                                    opening.id,
                                                                    chapter.id,
                                                                    variant.id,
                                                                    variant.name
                                                                  );
                                                                }}
                                                              />
                                                              <TrashIcon
                                                                className="w-5 h-5 text-red-500 hover:text-red-700"
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  deleteVariant(
                                                                    opening.id,
                                                                    chapter.id,
                                                                    variant.id
                                                                  );
                                                                }}
                                                              />
                                                            </div>
                                                          </div>
                                                        )}
                                                      </Draggable>
                                                    )
                                                  )}
                                                  {provided.placeholder}
                                                </div>
                                              )}
                                            </Droppable>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  )
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );

  // Board View Component
  const BoardView = () => {
    const currentVariant = getCurrentVariant();
    if (!currentVariant || !selectedPath) {
      return <div>Fehler beim Laden der Variante.</div>;
    }

    return (
      <div className="w-full h-full">
        <ChessboardComponent
          initialPgn={currentVariant.pgn}
          opening={selectedPath ? selectedPath.openingName : ""}
          chapter={selectedPath ? selectedPath.chapterName : ""}
          variant={selectedPath ? selectedPath.variantName : ""}
          onSave={handleSave}
          onBack={handleBack}
          onPgnChange={handlePgnUpdate} // Add this prop
        />
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50">
      {viewMode === "tree" ? <TreeView /> : <BoardView />}
    </div>
  );
};

export default OpeningExplorer;

import React, { useState, useEffect } from 'react';

interface CommentEditorProps {
  moveIndex: number;
  initialComment?: string;
  onCommentChange: (index: number, comment: string) => void;
}

const CommentEditor: React.FC<CommentEditorProps> = ({ 
  moveIndex, 
  initialComment = '', 
  onCommentChange 
}) => {
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    setComment(initialComment);
  }, [moveIndex, initialComment]);

  const handleChange = (newComment: string) => {
    setComment(newComment);
    onCommentChange(moveIndex, newComment);
  };

  return (
    <textarea
      value={comment}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={
        moveIndex >= 0 
          ? "Kommentar zum aktuellen Zug..." 
          : "Wählen Sie einen Zug aus, um einen Kommentar hinzuzufügen"
      }
      disabled={moveIndex < 0}
      className="w-full p-2 border rounded resize-y min-h-[100px]
        disabled:bg-gray-100 disabled:text-gray-500"
    />
  );
};

export default React.memo(CommentEditor);
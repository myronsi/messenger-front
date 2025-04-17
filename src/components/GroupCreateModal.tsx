
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface GroupCreateModalProps {
  onClose: () => void;
  onCreate: (groupName: string, participants: string[]) => void;
}

const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState('');
  const { translations } = useLanguage();

  const handleAddParticipant = () => {
    if (participantInput.trim() && !participants.includes(participantInput.trim())) {
      setParticipants([...participants, participantInput.trim()]);
      setParticipantInput('');
    }
  };

  const handleCreate = () => {
    if (groupName.trim() && participants.length > 0) {
      onCreate(groupName.trim(), participants);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-accent rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold mb-4">{translations.createGroup}</h2>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={translations.groupName}
          className="w-full p-2 mb-4 bg-background text-foreground border border-input rounded-md"
        />
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={participantInput}
            onChange={(e) => setParticipantInput(e.target.value)}
            placeholder={translations.addParticipant}
            className="flex-1 p-2 bg-background text-foreground border border-input rounded-md"
          />
          <button
            onClick={handleAddParticipant}
            className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {translations.add}
          </button>
        </div>
        <div className="mb-4 max-h-40 overflow-y-auto">
          {participants.map((participant, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-accent rounded-md mb-2">
              <span>{participant}</span>
              <button
                onClick={() => setParticipants(participants.filter((_, i) => i !== index))}
                className="text-destructive hover:text-destructive/90"
              >
                {translations.delete}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={!groupName.trim() || participants.length === 0}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {translations.create}
        </button>
      </div>
    </div>
  );
};

export default GroupCreateModal;

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  MessageSquare, 
  Calendar, 
  User, 
  Bot, 
  CheckSquare, 
  Square, 
  Upload,
  Info,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id?: string;
  title?: string;
  create_time?: number;
  mapping?: { [id: string]: any };
}

interface ConversationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  originalFilename: string;
  onUploadSelected: (selectedConversations: Conversation[], filename: string) => Promise<void>;
}

const ConversationSelector: React.FC<ConversationSelectorProps> = ({
  isOpen,
  onClose,
  conversations,
  originalFilename,
  onUploadSelected
}) => {
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  const [maxConversations, setMaxConversations] = useState<number>(50);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedConversations(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  // Auto-select first N conversations when max changes
  useEffect(() => {
    if (maxConversations > 0 && maxConversations <= conversations.length) {
      const newSelection = new Set<number>();
      for (let i = 0; i < Math.min(maxConversations, conversations.length); i++) {
        newSelection.add(i);
      }
      setSelectedConversations(newSelection);
    }
  }, [maxConversations, conversations.length]);

  const getConversationStats = (conversation: Conversation) => {
    if (!conversation.mapping) return { userMessages: 0, aiMessages: 0, totalMessages: 0 };
    
    const messages = Object.values(conversation.mapping);
    let userMessages = 0;
    let aiMessages = 0;
    
    messages.forEach((msgContainer: any) => {
      const msg = msgContainer.message;
      if (msg?.author?.role === 'user') userMessages++;
      else if (msg?.author?.role === 'assistant') aiMessages++;
    });
    
    return { userMessages, aiMessages, totalMessages: userMessages + aiMessages };
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const title = conv.title?.toLowerCase() || '';
    return title.includes(searchTerm.toLowerCase());
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelection = new Set<number>();
      filteredConversations.forEach((_, index) => {
        const originalIndex = conversations.indexOf(filteredConversations[index]);
        newSelection.add(originalIndex);
      });
      setSelectedConversations(newSelection);
    } else {
      setSelectedConversations(new Set());
    }
  };

  const handleConversationToggle = (index: number, checked: boolean) => {
    const newSelection = new Set(selectedConversations);
    if (checked) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelectedConversations(newSelection);
  };

  const handleUpload = async () => {
    if (selectedConversations.size === 0) {
      toast.error('Please select at least one conversation to upload');
      return;
    }

    setUploading(true);
    try {
      const selectedConvs = Array.from(selectedConversations)
        .map(index => conversations[index])
        .filter(Boolean);
      
      const newFilename = originalFilename.replace('.json', `_selected_${selectedConvs.length}.json`);
      
      await onUploadSelected(selectedConvs, newFilename);
      onClose();
      toast.success(`Successfully uploaded ${selectedConvs.length} conversations!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload selected conversations');
    } finally {
      setUploading(false);
    }
  };

  const allFilteredSelected = filteredConversations.length > 0 && 
    filteredConversations.every((_, index) => {
      const originalIndex = conversations.indexOf(filteredConversations[index]);
      return selectedConversations.has(originalIndex);
    });

  const someFilteredSelected = filteredConversations.some((_, index) => {
    const originalIndex = conversations.indexOf(filteredConversations[index]);
    return selectedConversations.has(originalIndex);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Select Conversations to Upload
          </DialogTitle>
          <DialogDescription>
            Choose which conversations from "{originalFilename}" you'd like to analyze. 
            We recommend selecting up to 50 conversations for optimal processing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Stats and Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-conversations">Max Conversations</Label>
              <Input
                id="max-conversations"
                type="number"
                min="1"
                max={conversations.length}
                value={maxConversations}
                onChange={(e) => setMaxConversations(parseInt(e.target.value) || 1)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Auto-selects first {maxConversations} conversations
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search">Search Conversations</Label>
              <Input
                id="search"
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Selection Summary</Label>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit">
                  {selectedConversations.size} of {conversations.length} selected
                </Badge>
                <Badge variant="secondary" className="w-fit">
                  {filteredConversations.length} shown
                </Badge>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Larger conversation files may take longer to process. For best performance, 
              we recommend selecting conversations with meaningful content and avoiding 
              very short or test conversations.
            </AlertDescription>
          </Alert>

          {/* Select All Controls */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="select-all"
              checked={allFilteredSelected}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="select-all" className="flex items-center gap-2 cursor-pointer">
              {allFilteredSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {allFilteredSelected ? 'Deselect All' : 'Select All'} 
              ({filteredConversations.length} conversations)
            </Label>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-3">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations match your search.</p>
                </div>
              ) : (
                filteredConversations.map((conversation, filteredIndex) => {
                  const originalIndex = conversations.indexOf(conversation);
                  const isSelected = selectedConversations.has(originalIndex);
                  const stats = getConversationStats(conversation);
                  
                  return (
                    <div
                      key={conversation.id || originalIndex}
                      className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleConversationToggle(originalIndex, checked as boolean)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {conversation.title || `Conversation ${originalIndex + 1}`}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(conversation.create_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {stats.userMessages}
                              </span>
                              <span className="flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {stats.aiMessages}
                              </span>
                            </div>
                          </div>
                          
                          <Badge variant="outline" className="shrink-0">
                            {stats.totalMessages} messages
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedConversations.size} conversations selected
              </span>
              <Button 
                onClick={handleUpload} 
                disabled={selectedConversations.size === 0 || uploading}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationSelector;
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Card,
  Avatar,
  Chip,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Services & Components
import { apiService } from '../services/apiService';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import { theme } from '../utils/theme';

const { height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  agentType?: string;
  confidence?: number;
  suggestions?: string[];
  attachments?: any[];
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  specialties: string[];
}

const AI_AGENTS: AIAgent[] = [
  {
    id: 'booking_assistant',
    name: 'Booking Assistant',
    description: 'Help with reservations and bookings',
    icon: 'calendar',
    color: '#4CAF50',
    specialties: ['bookings', 'availability', 'pricing'],
  },
  {
    id: 'travel_planner',
    name: 'Travel Planner',
    description: 'Create personalized itineraries',
    icon: 'map',
    color: '#2196F3',
    specialties: ['itineraries', 'destinations', 'activities'],
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    description: 'Support and assistance',
    icon: 'help-circle',
    color: '#FF9800',
    specialties: ['support', 'issues', 'information'],
  },
  {
    id: 'accessibility_specialist',
    name: 'Accessibility Expert',
    description: 'Specialized accessibility assistance',
    icon: 'accessibility',
    color: '#9C27B0',
    specialties: ['accessibility', 'accommodations', 'special-needs'],
  },
  {
    id: 'sustainability_advisor',
    name: 'Sustainability Advisor',
    description: 'Eco-friendly travel options',
    icon: 'leaf',
    color: '#4CAF50',
    specialties: ['sustainability', 'eco-travel', 'carbon-footprint'],
  },
];

const QUICK_QUESTIONS = [
  'Show me available tours this weekend',
  'What are the most popular destinations?',
  'Help me plan a 7-day itinerary',
  'Find accessibility-friendly hotels',
  'Calculate my trip carbon footprint',
  'Show my current bookings',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(AI_AGENTS[0]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Start new conversation with default agent
      const conversation = await apiService.startAIConversation(selectedAgent.id);
      setConversationId(conversation.id);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        text: `Hello ${user?.first_name || 'there'}! I'm your ${selectedAgent.name}. How can I help you today?`,
        isUser: false,
        timestamp: new Date(),
        agentType: selectedAgent.id,
        suggestions: QUICK_QUESTIONS.slice(0, 3),
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let response;
      if (conversationId) {
        response = await apiService.continueAIConversation(conversationId, messageText);
      } else {
        response = await apiService.askAI(messageText, { agent_type: selectedAgent.id });
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message || response.response,
        isUser: false,
        timestamp: new Date(),
        agentType: selectedAgent.id,
        confidence: response.confidence,
        suggestions: response.suggestions || [],
        attachments: response.attachments || [],
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
        agentType: selectedAgent.id,
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const selectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowAgentSelector(false);
    
    // Clear current conversation and start new one
    setMessages([]);
    setConversationId(null);
    initializeChat();
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {!message.isUser && (
        <Avatar.Icon
          size={32}
          icon={selectedAgent.icon}
          style={[styles.agentAvatar, { backgroundColor: selectedAgent.color }]}
        />
      )}
      
      <Card style={[
        styles.messageCard,
        message.isUser ? styles.userMessageCard : styles.aiMessageCard,
      ]}>
        <Card.Content style={styles.messageContent}>
          <Text style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.aiMessageText,
          ]}>
            {message.text}
          </Text>
          
          {message.confidence && (
            <Text style={styles.confidence}>
              Confidence: {Math.round(message.confidence * 100)}%
            </Text>
          )}
          
          <Text style={styles.messageTime}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </Card.Content>
        
        {message.suggestions && message.suggestions.length > 0 && (
          <Card.Actions style={styles.suggestionActions}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.suggestions}
            >
              {message.suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  onPress={() => sendMessage(suggestion)}
                  style={styles.suggestionChip}
                >
                  {suggestion}
                </Chip>
              ))}
            </ScrollView>
          </Card.Actions>
        )}
      </Card>
      
      {message.isUser && (
        <Avatar.Text
          size={32}
          label={user?.first_name?.[0] || 'U'}
          style={styles.userAvatar}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[selectedAgent.color, selectedAgent.color + '80']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.agentInfo}>
            <Avatar.Icon
              size={40}
              icon={selectedAgent.icon}
              style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            />
            <View>
              <Text style={styles.agentName}>{selectedAgent.name}</Text>
              <Text style={styles.agentDescription}>{selectedAgent.description}</Text>
            </View>
          </View>
          <IconButton
            icon="swap-horizontal"
            iconColor="white"
            size={24}
            onPress={() => setShowAgentSelector(true)}
          />
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Questions (show when no messages) */}
      {messages.length === 0 && (
        <View style={styles.quickQuestions}>
          <Text style={styles.quickQuestionsTitle}>Try asking:</Text>
          <View style={styles.quickQuestionChips}>
            {QUICK_QUESTIONS.slice(0, 4).map((question, index) => (
              <Chip
                key={index}
                mode="outlined"
                onPress={() => sendMessage(question)}
                style={styles.quickQuestionChip}
              >
                {question}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            style={styles.textInput}
            disabled={isLoading}
            onSubmitEditing={() => sendMessage()}
          />
          <IconButton
            icon="send"
            iconColor={theme.colors.primary}
            size={24}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Agent Selector Modal */}
      <Portal>
        <Modal
          visible={showAgentSelector}
          onDismiss={() => setShowAgentSelector(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Select AI Agent</Text>
          <ScrollView>
            {AI_AGENTS.map((agent) => (
              <Card
                key={agent.id}
                style={[
                  styles.agentCard,
                  selectedAgent.id === agent.id && styles.selectedAgentCard,
                ]}
                onPress={() => selectAgent(agent)}
              >
                <Card.Content style={styles.agentCardContent}>
                  <Avatar.Icon
                    size={40}
                    icon={agent.icon}
                    style={[styles.agentCardAvatar, { backgroundColor: agent.color }]}
                  />
                  <View style={styles.agentCardInfo}>
                    <Text style={styles.agentCardName}>{agent.name}</Text>
                    <Text style={styles.agentCardDescription}>{agent.description}</Text>
                    <View style={styles.specialties}>
                      {agent.specialties.map((specialty) => (
                        <Chip key={specialty} compact mode="outlined">
                          {specialty}
                        </Chip>
                      ))}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    marginRight: 12,
  },
  agentName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  agentDescription: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageCard: {
    flex: 1,
    maxWidth: '80%',
  },
  userMessageCard: {
    marginLeft: 20,
    backgroundColor: theme.colors.primary,
  },
  aiMessageCard: {
    marginRight: 20,
    backgroundColor: 'white',
  },
  messageContent: {
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  confidence: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
    marginTop: 4,
  },
  agentAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    marginLeft: 8,
    marginBottom: 4,
  },
  suggestionActions: {
    paddingHorizontal: 0,
  },
  suggestions: {
    paddingHorizontal: 16,
  },
  suggestionChip: {
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontStyle: 'italic',
    color: theme.colors.text,
  },
  quickQuestions: {
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.text,
  },
  quickQuestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.text,
  },
  agentCard: {
    marginBottom: 12,
  },
  selectedAgentCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  agentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentCardAvatar: {
    marginRight: 15,
  },
  agentCardInfo: {
    flex: 1,
  },
  agentCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  agentCardDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import CustomDrawer from './CustomDrawer';

// Types for TypeScript
type Message = {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    status?: 'pending' | 'sent';
    quickActions?: QuickAction[];
};

type QuickAction = 'Book ride' | 'Become a driver' | 'Contact support' | 'Open pricing';

type Intent = {
    key: 'company' | 'services' | 'features' | 'safety' | 'pricing' | 'driver' | 'technical' | 'contact';
    label: string;
    keywords: string[];
    response: string;
    quickActions: QuickAction[];
};

type IntentKey = Intent['key'];

type StoredMessage = Omit<Message, 'timestamp'> & {
    timestamp: string;
};

const STORAGE_KEY = 'nthome_customer_chatbot_history_v1';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';
const OPENROUTER_API_KEY = (Constants.expoConfig?.extra as { openRouterApiKey?: string } | undefined)?.openRouterApiKey || '';

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultWelcomeMessage: Message = {
    id: 'welcome-1',
    text: "Hello! I'm your NthomeRidez assistant. I can help you with information about our e-hailing services, features, pricing, and company details. How can I assist you today?",
    isUser: false,
    timestamp: new Date(),
    status: 'sent',
    quickActions: ['Book ride', 'Open pricing', 'Become a driver', 'Contact support'],
};

const AnimatedMessageBubble: React.FC<{
    item: Message;
    onQuickActionPress: (action: QuickAction) => void;
}> = ({ item, onQuickActionPress }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateAnim, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, translateAnim]);

    return (
        <Animated.View
            style={[
                styles.messageContainer,
                item.isUser ? styles.userMessage : styles.botMessage,
                { opacity: fadeAnim, transform: [{ translateY: translateAnim }] },
            ]}
        >
            <View
                style={[
                    styles.messageBubble,
                    item.isUser ? styles.userBubble : styles.botBubble,
                ]}
            >
                <Text
                    style={[
                        styles.messageText,
                        item.isUser ? styles.userMessageText : styles.botMessageText,
                    ]}
                >
                    {item.text}
                </Text>

                {!!item.quickActions?.length && !item.isUser && (
                    <View style={styles.quickActionsRow}>
                        {item.quickActions.map((action) => (
                            <TouchableOpacity
                                key={`${item.id}-${action}`}
                                style={styles.quickActionChip}
                                onPress={() => onQuickActionPress(action)}
                            >
                                <Text style={styles.quickActionChipText}>{action}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.messageMetaRow}>
                    <Text style={styles.timestamp}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.isUser && (
                        <Text style={styles.deliveryState}>
                            {item.status === 'pending' ? 'Sending…' : 'Sent'}
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

type ChatBotProps = {
    onClose: () => void;
    navigation?: any;
};

const ChatBot: React.FC<ChatBotProps> = ({ onClose, navigation }) => {
    const [messages, setMessages] = useState<Message[]>([defaultWelcomeMessage]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [lastDetectedIntent, setLastDetectedIntent] = useState<IntentKey | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const hasLoadedHistoryRef = useRef(false);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const knowledgeBase = {
        company: {
            background: "Nthome Express Couriers was established in 2019 under Faith Heals Construction C Projects. We're a courier, delivery, and e-hailing ride service primarily serving Mamelodi, Pretoria, with operations extending to Johannesburg and Pretoria areas.",
            workforce: 'We currently have 4 contractors and are expanding our operations.',
            mission: 'To provide efficient and reliable delivery services, catering to both individual and business needs.',
        },
        services: {
            rides: 'NthomeRides - Your reliable ride, anytime, anywhere with real-time tracking and multiple vehicle options.',
            air: 'NthomeAir - Elevate your travel experience with premium air travel services.',
            food: 'NthomeFood - Delicious meals delivered to your doorstep (Coming Soon).',
            van: 'NthomeVan - Move your belongings and heavy items anywhere in South Africa with our reliable van service (Coming Soon).',
        },
        features: {
            customer: [
                'Sign-up and Login',
                'Request Rides (immediate and advance booking)',
                'Real-time Driver Tracking',
                'Vehicle and Driver Preference Selection',
                'Ride Sharing Options',
                'Secure Payment Processing',
                'Emergency Button for Safety',
                'Rating and Feedback System',
            ],
            driver: [
                'Driver Registration and Verification',
                'Subscription Plans (monthly/weekly)',
                'Availability Status Toggle',
                'Ride Request Management',
                'Earnings Tracking',
                'Navigation Support',
                'Safety Features',
            ],
            admin: [
                'User Management',
                'Ride Monitoring',
                'Payment Oversight',
                'Support System Management',
                'Analytics and Reports',
            ],
        },
        safety: [
            'Real-time tracking for all rides',
            'Emergency button for drivers and customers',
            'Driver and vehicle verification',
            'Ride sharing options',
            'Gender preference selection',
        ],
        pricing: {
            rides: 'Base fare + distance + time',
            driverSubscriptions: 'Monthly and weekly subscription plans available',
            payments: 'Secure electronic payments with detailed receipts',
        },
        contact: {
            support: 'Available 24/7',
            email: 'support@nthome.com',
            areas: 'Mamelodi, Pretoria, Johannesburg areas',
        },
        technical: {
            platform: 'Android app (iOS coming soon)',
            stack: 'React Native, Firebase (Authentication, Firestore, Realtime Database)',
            features: 'GPS tracking, payment integration, real-time updates',
        },
    };

    const intents = useMemo<Intent[]>(() => ([
        {
            key: 'company',
            label: 'Company information',
            keywords: ['company', 'background', 'about', 'nthome', 'history', 'mission'],
            response: `Nthome Express Couriers: ${knowledgeBase.company.background} We currently have ${knowledgeBase.company.workforce} Our mission: ${knowledgeBase.company.mission}`,
            quickActions: ['Book ride', 'Contact support'],
        },
        {
            key: 'services',
            label: 'Services and booking',
            keywords: ['service', 'ride', 'book', 'trip', 'transport', 'courier', 'van'],
            response: `Our Services:\n• ${knowledgeBase.services.rides}\n• ${knowledgeBase.services.air}\n• ${knowledgeBase.services.food}\n• ${knowledgeBase.services.van}\n\nYou can book rides through our app with real-time tracking and multiple vehicle options.`,
            quickActions: ['Book ride', 'Open pricing'],
        },
        {
            key: 'features',
            label: 'Platform features',
            keywords: ['feature', 'what can', 'how does', 'benefit', 'option'],
            response: `Key Features:\n\nFor Customers:\n${knowledgeBase.features.customer.map((feature) => `• ${feature}`).join('\n')}\n\nFor Drivers:\n${knowledgeBase.features.driver.map((feature) => `• ${feature}`).join('\n')}`,
            quickActions: ['Book ride', 'Become a driver'],
        },
        {
            key: 'safety',
            label: 'Safety and security',
            keywords: ['safety', 'secure', 'emergency', 'safe', 'protection'],
            response: `Safety Features:\n${knowledgeBase.safety.map((safetyItem) => `• ${safetyItem}`).join('\n')}\n\nWe prioritize the safety of both drivers and customers with comprehensive security measures.`,
            quickActions: ['Contact support', 'Book ride'],
        },
        {
            key: 'pricing',
            label: 'Pricing and payments',
            keywords: ['price', 'cost', 'how much', 'payment', 'fare', 'charge'],
            response: `Pricing Information:\n• Rides: ${knowledgeBase.pricing.rides}\n• Driver Subscriptions: ${knowledgeBase.pricing.driverSubscriptions}\n• Payments: ${knowledgeBase.pricing.payments}\n\nAll payments are processed securely with detailed receipts provided.`,
            quickActions: ['Open pricing', 'Contact support'],
        },
        {
            key: 'driver',
            label: 'Driver onboarding',
            keywords: ['driver', 'become driver', 'sign up driver', 'registration', 'earnings'],
            response: `Driver Information:\n${knowledgeBase.features.driver.map((feature) => `• ${feature}`).join('\n')}\n\nDrivers can choose subscription plans and receive comprehensive support.`,
            quickActions: ['Become a driver', 'Contact support'],
        },
        {
            key: 'technical',
            label: 'Technical details',
            keywords: ['app', 'download', 'technical', 'platform', 'android', 'ios'],
            response: `Technical Details:\n• Platform: ${knowledgeBase.technical.platform}\n• Technology: ${knowledgeBase.technical.stack}\n• Key Features: ${knowledgeBase.technical.features}`,
            quickActions: ['Book ride', 'Contact support'],
        },
        {
            key: 'contact',
            label: 'Support and contact',
            keywords: ['contact', 'support', 'help', 'customer service', 'email'],
            response: `Contact & Support:\n• Support: ${knowledgeBase.contact.support}\n• Email: ${knowledgeBase.contact.email}\n• Service Areas: ${knowledgeBase.contact.areas}\n\nOur support team is available 24/7 to assist you.`,
            quickActions: ['Contact support', 'Book ride'],
        },
    ]), [knowledgeBase.company.background, knowledgeBase.company.mission, knowledgeBase.company.workforce, knowledgeBase.contact.areas, knowledgeBase.contact.email, knowledgeBase.contact.support, knowledgeBase.features.customer, knowledgeBase.features.driver, knowledgeBase.pricing.driverSubscriptions, knowledgeBase.pricing.payments, knowledgeBase.pricing.rides, knowledgeBase.safety, knowledgeBase.services.air, knowledgeBase.services.food, knowledgeBase.services.rides, knowledgeBase.services.van, knowledgeBase.technical.features, knowledgeBase.technical.platform, knowledgeBase.technical.stack]);

    const nthomeContext = useMemo(() => ([
        `Company Background: ${knowledgeBase.company.background}`,
        `Workforce: ${knowledgeBase.company.workforce}`,
        `Mission: ${knowledgeBase.company.mission}`,
        `Services: ${knowledgeBase.services.rides} | ${knowledgeBase.services.air} | ${knowledgeBase.services.food} | ${knowledgeBase.services.van}`,
        `Customer Features: ${knowledgeBase.features.customer.join('; ')}`,
        `Driver Features: ${knowledgeBase.features.driver.join('; ')}`,
        `Safety: ${knowledgeBase.safety.join('; ')}`,
        `Pricing: rides=${knowledgeBase.pricing.rides}; driverSubscriptions=${knowledgeBase.pricing.driverSubscriptions}; payments=${knowledgeBase.pricing.payments}`,
        `Support: ${knowledgeBase.contact.support}; email=${knowledgeBase.contact.email}; areas=${knowledgeBase.contact.areas}`,
        `Technical: platform=${knowledgeBase.technical.platform}; stack=${knowledgeBase.technical.stack}; features=${knowledgeBase.technical.features}`,
    ].join('\n')), [knowledgeBase.company.background, knowledgeBase.company.mission, knowledgeBase.company.workforce, knowledgeBase.contact.areas, knowledgeBase.contact.email, knowledgeBase.contact.support, knowledgeBase.features.customer, knowledgeBase.features.driver, knowledgeBase.pricing.driverSubscriptions, knowledgeBase.pricing.payments, knowledgeBase.pricing.rides, knowledgeBase.safety, knowledgeBase.services.air, knowledgeBase.services.food, knowledgeBase.services.rides, knowledgeBase.services.van, knowledgeBase.technical.features, knowledgeBase.technical.platform, knowledgeBase.technical.stack]);

    const scoreIntent = (message: string, keywords: string[]): number => {
        const normalizedMessage = message.toLowerCase();
        return keywords.reduce((score, keyword) => {
            if (normalizedMessage === keyword) {
                return score + 3;
            }
            if (normalizedMessage.includes(keyword)) {
                return score + 2;
            }
            return score;
        }, 0);
    };

    const getContextualQuickActions = (intentKey: IntentKey | null): QuickAction[] => {
        if (!intentKey) {
            return ['Open pricing', 'Become a driver', 'Contact support', 'Book ride'];
        }

        const matchedIntent = intents.find((intent) => intent.key === intentKey);
        if (!matchedIntent) {
            return ['Open pricing', 'Become a driver', 'Contact support', 'Book ride'];
        }

        const contextual = [...matchedIntent.quickActions];
        if (!contextual.includes('Contact support')) {
            contextual.push('Contact support');
        }

        return contextual.slice(0, 4);
    };

    const generateResponse = (userMessage: string): { text: string; quickActions: QuickAction[]; intentKey: IntentKey | null } => {
        const ranked = intents
            .map((intent) => ({
                intent,
                score: scoreIntent(userMessage, intent.keywords),
            }))
            .sort((a, b) => b.score - a.score);

        const bestMatch = ranked[0];
        if (bestMatch && bestMatch.score > 0) {
            return {
                text: bestMatch.intent.response,
                quickActions: bestMatch.intent.quickActions,
                intentKey: bestMatch.intent.key,
            };
        }

        return {
            text: 'I want to make sure I answer correctly. Did you mean pricing, safety, or driver signup? You can also ask about services, app features, or company details.',
            quickActions: getContextualQuickActions(lastDetectedIntent),
            intentKey: null,
        };
    };

    const contextualQuickQuestionPrompts = useMemo(() => {
        const promptMap: Record<IntentKey, string[]> = {
            company: [
                'Tell me about Nthome.',
                'What is your mission?',
                'Where do you operate?',
                'How many contractors do you have?',
            ],
            services: [
                'What services do you offer?',
                'How do I book a ride?',
                'Do you offer courier delivery?',
                'Is NthomeVan available now?',
            ],
            features: [
                'What features are available for customers?',
                'How does live tracking work?',
                'Can I schedule rides in advance?',
                'What features are available for drivers?',
            ],
            safety: [
                'What safety features do you have?',
                'How does the emergency button work?',
                'How do you verify drivers?',
                'Can riders share trip details?',
            ],
            pricing: [
                'How much do rides cost?',
                'How are fares calculated?',
                'Are payments secure?',
                'Do drivers pay subscription fees?',
            ],
            driver: [
                'How do I become a driver?',
                'What are driver requirements?',
                'How do subscriptions work?',
                'How do drivers track earnings?',
            ],
            technical: [
                'Which platform is supported?',
                'Is iOS available?',
                'Which technology powers the app?',
                'Does the app support real-time updates?',
            ],
            contact: [
                'How can I contact support?',
                'What are support hours?',
                'Do you have an email address?',
                'Which areas do you serve?',
            ],
        };

        if (!lastDetectedIntent) {
            return [
                'What services do you offer?',
                'How do I become a driver?',
                'What safety features do you have?',
                'How much do rides cost?',
            ];
        }

        return promptMap[lastDetectedIntent];
    }, [lastDetectedIntent]);

    const serializeMessages = (items: Message[]): string => {
        const payload: StoredMessage[] = items.map((item) => ({
            ...item,
            timestamp: item.timestamp.toISOString(),
        }));
        return JSON.stringify(payload);
    };

    const deserializeMessages = (payload: string): Message[] => {
        const parsed = JSON.parse(payload) as StoredMessage[];
        return parsed.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp),
        }));
    };

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const restored = deserializeMessages(saved);
                    if (restored.length > 0) {
                        setMessages(restored);
                    }
                }
            } catch (error) {
                console.warn('Failed to restore chatbot history:', error);
            } finally {
                hasLoadedHistoryRef.current = true;
            }
        };

        loadHistory();
    }, []);

    useEffect(() => {
        if (!hasLoadedHistoryRef.current) {
            return;
        }

        const saveHistory = async () => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, serializeMessages(messages));
            } catch (error) {
                console.warn('Failed to persist chatbot history:', error);
            }
        };

        saveHistory();
    }, [messages]);

    const markMessageSent = (messageId: string) => {
        setMessages((prev) => prev.map((item) => (
            item.id === messageId ? { ...item, status: 'sent' } : item
        )));
    };

    const getQuickActionPrompt = (action: QuickAction): string => {
        switch (action) {
            case 'Book ride':
                return 'How do I book a ride now?';
            case 'Become a driver':
                return 'How do I become a driver?';
            case 'Contact support':
                return 'How can I contact support?';
            case 'Open pricing':
                return 'How much do rides cost?';
            default:
                return 'Tell me more.';
        }
    };

    const getAiResponseFromOpenRouter = async (userMessage: string, recentMessages: Message[]): Promise<string | null> => {
        if (!OPENROUTER_API_KEY) {
            return null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const normalizeAiResponse = (rawText: string): string => {
            const compact = rawText.replace(/\s+/g, ' ').trim();
            if (!compact) {
                return compact;
            }

            const sentences = compact.match(/[^.!?]+[.!?]+/g) || [compact];
            const concise = sentences.slice(0, 5).join(' ').trim();

            if (concise.length <= 700) {
                return concise;
            }

            return `${concise.slice(0, 697).trim()}...`;
        };

        try {
            const history = recentMessages
                .filter((message) => message.text?.trim())
                .slice(-8)
                .map((message) => ({
                    role: message.isUser ? 'user' : 'assistant',
                    content: message.text,
                }));

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    temperature: 0.35,
                    max_tokens: 260,
                    messages: [
                        {
                            role: 'system',
                            content: `You are Nthome Assist for NthomeRidez.

Goal:
- Have a normal, human-like conversation with the user.
- Keep track of the chat context and handle follow-up questions naturally.

Rules:
- Use ONLY the Nthome information below as your factual source.
- If the answer is not in the source, clearly say you are not certain and direct the user to support.
- Prefer concise but natural replies (usually 2-5 sentences).
- If the user message is ambiguous, ask one short clarifying question.
- Summarize information in your own words; do not dump raw source text.
- Only use bullets if the user explicitly asks for a list.
- Do not invent prices, dates, features, or policies.

Nthome Source Information:
${nthomeContext}`,
                        },
                        ...history,
                        { role: 'user', content: userMessage },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const aiText = data?.choices?.[0]?.message?.content;
            if (typeof aiText === 'string' && aiText.trim()) {
                return normalizeAiResponse(aiText);
            }

            return null;
        } catch (error) {
            console.warn('OpenRouter request failed, using fallback response:', error);
            return null;
        } finally {
            clearTimeout(timeout);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const messageText = inputText.trim();
        const priorMessages = [...messages];
        const userMessage: Message = {
            id: createMessageId(),
            text: messageText,
            isUser: true,
            timestamp: new Date(),
            status: 'pending',
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        setTimeout(() => {
            markMessageSent(userMessage.id);
        }, 350);

        try {
            const fallbackResponse = generateResponse(messageText);
            if (fallbackResponse.intentKey) {
                setLastDetectedIntent(fallbackResponse.intentKey);
            }

            const aiResponse = await getAiResponseFromOpenRouter(messageText, priorMessages);

            const botMessage: Message = {
                id: createMessageId(),
                text: aiResponse || fallbackResponse.text,
                isUser: false,
                timestamp: new Date(),
                status: 'sent',
                quickActions: fallbackResponse.quickActions,
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error: any) {
            console.error('Error in sendMessage:', error);

            const errorMessage: Message = {
                id: createMessageId(),
                text: "I'm currently experiencing technical difficulties. Please contact our support team directly for assistance.",
                isUser: false,
                timestamp: new Date(),
                status: 'sent',
                quickActions: ['Contact support'],
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const onQuickActionPress = (action: QuickAction) => {
        const prompt = getQuickActionPrompt(action);
        setInputText(prompt);
    };

    const renderTypingIndicator = () => {
        if (!isLoading) {
            return null;
        }

        return (
            <View style={[styles.messageContainer, styles.botMessage, styles.typingContainer]}>
                <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color="#0DCAF0" />
                    <Text style={styles.typingText}>Nthome Assist is typing...</Text>
                </View>
            </View>
        );
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <AnimatedMessageBubble item={item} onQuickActionPress={onQuickActionPress} />
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
                                <Ionicons name="menu" size={24} color="#0f172a" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Nthome Assistant</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.welcomeBanner}>
                        <Text style={styles.welcomeTitle}>NthomeRidez Support</Text>
                        <Text style={styles.welcomeText}>
                            Ask me about our services, features, pricing, safety, or company information
                        </Text>
                    </View>

                    <View style={styles.quickQuestions}>
                        <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
                        <View style={styles.questionChips}>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText(contextualQuickQuestionPrompts[0] ?? 'What services do you offer?')}
                            >
                                <Text style={styles.questionChipText} numberOfLines={1} ellipsizeMode="tail">{contextualQuickQuestionPrompts[0] ?? 'Services'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText(contextualQuickQuestionPrompts[1] ?? 'How do I become a driver?')}
                            >
                                <Text style={styles.questionChipText} numberOfLines={1} ellipsizeMode="tail">{contextualQuickQuestionPrompts[1] ?? 'Become a Driver'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText(contextualQuickQuestionPrompts[2] ?? 'What safety features do you have?')}
                            >
                                <Text style={styles.questionChipText} numberOfLines={1} ellipsizeMode="tail">{contextualQuickQuestionPrompts[2] ?? 'Safety'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText(contextualQuickQuestionPrompts[3] ?? 'How much do rides cost?')}
                            >
                                <Text style={styles.questionChipText} numberOfLines={1} ellipsizeMode="tail">{contextualQuickQuestionPrompts[3] ?? 'Pricing'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.messagesContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.messagesList}
                            ListFooterComponent={renderTypingIndicator}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            scrollEnabled
                        />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.inputContainer}
                    >
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask about NthomeRidez..."
                                placeholderTextColor="#999"
                                multiline
                                maxLength={500}
                                editable={!isLoading}
                                onSubmitEditing={sendMessage}
                                returnKeyType="send"
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                                ]}
                                onPress={sendMessage}
                                disabled={!inputText.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="send" size={20} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>

            {drawerOpen && (
                <View style={styles.drawerOverlay}>
                    <CustomDrawer
                        isOpen={drawerOpen}
                        toggleDrawer={toggleDrawer}
                        navigation={navigation}
                        currentScreen="ChatBot"
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginLeft: 8,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    welcomeBanner: {
        backgroundColor: '#0DCAF0',
        padding: 16,
        margin: 16,
        borderRadius: 12,
        shadowColor: '#0DCAF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    welcomeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 18,
    },
    quickQuestions: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    quickQuestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    questionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 8,
    },
    questionChip: {
        width: '48%',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#0DCAF0',
        justifyContent: 'center',
    },
    questionChipText: {
        fontSize: 12,
        color: '#0DCAF0',
        fontWeight: '500',
        textAlign: 'center',
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        marginBottom: 16,
    },
    userMessage: {
        alignItems: 'flex-end',
    },
    botMessage: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubble: {
        backgroundColor: '#0DCAF0',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: '#fff',
    },
    botMessageText: {
        color: '#0f172a',
    },
    timestamp: {
        fontSize: 11,
        color: '#999',
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    messageMetaRow: {
        marginTop: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    deliveryState: {
        fontSize: 11,
        color: '#dbeafe',
    },
    quickActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    quickActionChip: {
        backgroundColor: '#f0f9ff',
        borderColor: '#bae6fd',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    quickActionChipText: {
        fontSize: 12,
        color: '#0369a1',
        fontWeight: '600',
    },
    typingContainer: {
        marginBottom: 6,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typingText: {
        fontSize: 13,
        color: '#64748b',
        fontStyle: 'italic',
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        padding: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 12,
        maxHeight: 100,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0DCAF0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0DCAF0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
        shadowOpacity: 0,
        elevation: 0,
    },
    drawerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
});

export default ChatBot;

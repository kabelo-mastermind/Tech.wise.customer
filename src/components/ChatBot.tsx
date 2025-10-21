import React, { useState, useRef, useEffect } from 'react';
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
    Alert,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from './CustomDrawer';

// Types for TypeScript
type Message = {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
};

type ChatBotProps = {
    onClose: () => void;
    navigation?: any; // Add navigation prop
};

const ChatBot: React.FC<ChatBotProps> = ({ onClose, navigation }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hello! I'm your NthomeRidez assistant. I can help you with information about our e-hailing services, features, pricing, and company details. How can I assist you today?",
            isUser: false,
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false); // Add drawer state
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Knowledge base with all project information
    const knowledgeBase = {
        company: {
            background: "Nthome Express Couriers was established in 2019 under Faith Heals Construction C Projects. We're a courier, delivery, and e-hailing ride service primarily serving Mamelodi, Pretoria, with operations extending to Johannesburg and Pretoria areas.",
            workforce: "We currently have 4 contractors and are expanding our operations.",
            mission: "To provide efficient and reliable delivery services, catering to both individual and business needs."
        },
        services: {
            rides: "NthomeRides - Your reliable ride, anytime, anywhere with real-time tracking and multiple vehicle options.",
            air: "NthomeAir - Elevate your travel experience with premium air travel services.",
            food: "NthomeFood - Delicious meals delivered to your doorstep (Coming Soon).",
            shop: "NthomeShop - Shop your favorite items with fast delivery (Coming Soon)."
        },
        features: {
            customer: [
                "Sign-up and Login",
                "Request Rides (immediate and advance booking)",
                "Real-time Driver Tracking",
                "Vehicle and Driver Preference Selection",
                "Ride Sharing Options",
                "Secure Payment Processing",
                "Emergency Button for Safety",
                "Rating and Feedback System"
            ],
            driver: [
                "Driver Registration and Verification",
                "Subscription Plans (monthly/weekly)",
                "Availability Status Toggle",
                "Ride Request Management",
                "Earnings Tracking",
                "Navigation Support",
                "Safety Features"
            ],
            admin: [
                "User Management",
                "Ride Monitoring",
                "Payment Oversight",
                "Support System Management",
                "Analytics and Reports"
            ]
        },
        safety: [
            "Real-time tracking for all rides",
            "Emergency button for drivers and customers",
            "Driver and vehicle verification",
            "Ride sharing options",
            "Gender preference selection"
        ],
        pricing: {
            rides: "Base fare + distance + time",
            driverSubscriptions: "Monthly and weekly subscription plans available",
            payments: "Secure electronic payments with detailed receipts"
        },
        contact: {
            support: "Available 24/7",
            email: "support@nthome.com",
            areas: "Mamelodi, Pretoria, Johannesburg areas"
        },
        technical: {
            platform: "Android app (iOS coming soon)",
            stack: "React Native, Firebase (Authentication, Firestore, Realtime Database)",
            features: "GPS tracking, payment integration, real-time updates"
        }
    };

    // Simple AI response generator based on keywords
    const generateResponse = (userMessage: string): string => {
        const message = userMessage.toLowerCase();

        // Company information
        if (message.includes('company') || message.includes('background') || message.includes('about') || message.includes('nthome')) {
            return `Nthome Express Couriers: ${knowledgeBase.company.background} We currently have ${knowledgeBase.company.workforce} Our mission: ${knowledgeBase.company.mission}`;
        }

        // Services
        if (message.includes('service') || message.includes('ride') || message.includes('book')) {
            return `Our Services:\n• ${knowledgeBase.services.rides}\n• ${knowledgeBase.services.air}\n• ${knowledgeBase.services.food}\n• ${knowledgeBase.services.shop}\n\nYou can book rides through our app with real-time tracking and multiple vehicle options.`;
        }

        // Features
        if (message.includes('feature') || message.includes('what can') || message.includes('how does')) {
            return `Key Features:\n\nFor Customers:\n${knowledgeBase.features.customer.map(f => `• ${f}`).join('\n')}\n\nFor Drivers:\n${knowledgeBase.features.driver.map(f => `• ${f}`).join('\n')}`;
        }

        // Safety
        if (message.includes('safety') || message.includes('secure') || message.includes('emergency') || message.includes('safe')) {
            return `Safety Features:\n${knowledgeBase.safety.map(s => `• ${s}`).join('\n')}\n\nWe prioritize the safety of both drivers and customers with comprehensive security measures.`;
        }

        // Pricing
        if (message.includes('price') || message.includes('cost') || message.includes('how much') || message.includes('payment')) {
            return `Pricing Information:\n• Rides: ${knowledgeBase.pricing.rides}\n• Driver Subscriptions: ${knowledgeBase.pricing.driverSubscriptions}\n• Payments: ${knowledgeBase.pricing.payments}\n\nAll payments are processed securely with detailed receipts provided.`;
        }

        // Driver information
        if (message.includes('driver') || message.includes('become driver') || message.includes('sign up driver')) {
            return `Driver Information:\n${knowledgeBase.features.driver.map(f => `• ${f}`).join('\n')}\n\nDrivers can choose subscription plans and receive comprehensive support.`;
        }

        // Technical
        if (message.includes('app') || message.includes('download') || message.includes('technical') || message.includes('platform')) {
            return `Technical Details:\n• Platform: ${knowledgeBase.technical.platform}\n• Technology: ${knowledgeBase.technical.stack}\n• Key Features: ${knowledgeBase.technical.features}`;
        }

        // Contact
        if (message.includes('contact') || message.includes('support') || message.includes('help') || message.includes('customer service')) {
            return `Contact & Support:\n• Support: ${knowledgeBase.contact.support}\n• Email: ${knowledgeBase.contact.email}\n• Service Areas: ${knowledgeBase.contact.areas}\n\nOur support team is available 24/7 to assist you.`;
        }

        // Default response for unknown queries
        return "I can help you with information about NthomeRidez services, features, pricing, safety measures, and company details. Could you please ask about our services, driver registration, safety features, or pricing?";
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Generate response from knowledge base
            const responseText = generateResponse(userMessage.text);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                isUser: false,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            console.error('Error in sendMessage:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm currently experiencing technical difficulties. Please contact our support team directly for assistance.",
                isUser: false,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageContainer,
            item.isUser ? styles.userMessage : styles.botMessage
        ]}>
            <View style={[
                styles.messageBubble,
                item.isUser ? styles.userBubble : styles.botBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    item.isUser ? styles.userMessageText : styles.botMessageText
                ]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={handleCloseDrawer}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
                                <Ionicons name="menu" size={24} color="#0f172a" />
                            </TouchableOpacity>
                            {/* <Ionicons name="car-sport" size={24} color="#0DCAF0" /> */}
                            <Text style={styles.headerTitle}>Nthome Assistant</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Welcome Message */}
                    <View style={styles.welcomeBanner}>
                        <Text style={styles.welcomeTitle}>NthomeRidez Support</Text>
                        <Text style={styles.welcomeText}>
                            Ask me about our services, features, pricing, safety, or company information
                        </Text>
                    </View>

                    {/* Quick Questions */}
                    <View style={styles.quickQuestions}>
                        <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
                        <View style={styles.questionChips}>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText("What services do you offer?")}
                            >
                                <Text style={styles.questionChipText}>Services</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText("How do I become a driver?")}
                            >
                                <Text style={styles.questionChipText}>Become a Driver</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText("What safety features do you have?")}
                            >
                                <Text style={styles.questionChipText}>Safety</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.questionChip}
                                onPress={() => setInputText("How much do rides cost?")}
                            >
                                <Text style={styles.questionChipText}>Pricing</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Messages List */}
                    <View style={styles.messagesContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.messagesList}
                        />
                    </View>

                    {/* Input Area */}
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
                                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled
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
            </TouchableWithoutFeedback>

            {/* Custom Drawer */}
            {drawerOpen && (
                <View style={styles.drawerOverlay}>
                    <CustomDrawer 
                        isOpen={drawerOpen} 
                        toggleDrawer={toggleDrawer} 
                        navigation={navigation} 
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
        gap: 8,
    },
    questionChip: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#0DCAF0',
    },
    questionChipText: {
        fontSize: 12,
        color: '#0DCAF0',
        fontWeight: '500',
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
        marginTop: 4,
        alignSelf: 'flex-end',
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
"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, StyleSheet } from "react-native"
import { Icon } from "react-native-elements"
import {
  listenToChatMessages,
  emitChatMessage,
  stopListeningToChatMessages,
  emitEditMessage,
  listenToEditedMessages,
  emitDeleteMessage,
  listenToDeletedMessages,
  connectSocket,
} from "../configSocket/socketConfig"
import { useSelector } from "react-redux"

const CustomerChat = () => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editedMessageText, setEditedMessageText] = useState("")
  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const [optionsVisible, setOptionsVisible] = useState(null)
  const flatListRef = useRef(null)

  // Redux selectors
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const driverId = useSelector((state) => state.trip.tripData?.driver_id || "")
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")

  // State for messages and input text
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    if (user_id) {
      connectSocket(user_id, 'customer')
    }
  
    const handleNewMessage = (incomingMessage) => {
      setMessages(prev => [...prev, incomingMessage])
      console.log('Incoming message', incomingMessage);
    }
  
    listenToChatMessages(handleNewMessage)
  
    return () => {
      stopListeningToChatMessages()
    }
  }, [user_id])

  const sendMessage = async () => {
    if (!messageText.trim()) return

    const messageData = {
      id: Date.now().toString(),
      senderId: user_id,
      receiverId: driverId,
      tripId: trip_id,
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
    }

    try {
      setMessages(prev => [...prev, messageData])
      emitChatMessage(messageData)
      setMessageText("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const editMessage = () => {
    if (!editedMessageText.trim()) return

    setMessages(prev =>
      prev.map(msg => 
        msg.id === selectedMessageId ? { ...msg, message: editedMessageText } : msg
      )
    )

    emitEditMessage({
      messageId: selectedMessageId,
      newMessage: editedMessageText.trim(),
      senderId: user_id,
      receiverId: driverId,
      timestamp: new Date().toISOString(),
    })

    setEditModalVisible(false)
    setOptionsVisible(null)
  }

  const deleteMessage = (messageId) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: () => {
          setMessages(prev => prev.filter(msg => msg.id !== messageId))
          emitDeleteMessage({ messageId, senderId: user_id, receiverId: driverId })
        },
        style: "destructive",
      },
    ])
    setOptionsVisible(null)
  }

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble, 
            item.senderId === user_id ? styles.sentMessage : styles.receivedMessage
          ]}>
            <Text style={[
              styles.messageText, 
              item.senderId === user_id ? styles.sentText : styles.receivedText
            ]}>
              {item.message}
            </Text>
            <Text style={[
              styles.timestamp,
              item.senderId === user_id ? styles.sentTimestamp : styles.receivedTimestamp
            ]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>

            {item.senderId === user_id && (
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setOptionsVisible(optionsVisible === item.id ? null : item.id)}
              >
                <Icon name="more-vert" size={20} color={item.senderId === user_id ? "#fff" : "#333"} />
              </TouchableOpacity>
            )}

            {optionsVisible === item.id && (
              <View style={[
                styles.optionsMenu,
                item.senderId === user_id ? styles.sentOptionsMenu : styles.receivedOptionsMenu
              ]}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setSelectedMessageId(item.id)
                    setEditedMessageText(item.message)
                    setEditModalVisible(true)
                  }}
                >
                  <Text style={styles.optionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.optionButton}
                  onPress={() => deleteMessage(item.id)}
                >
                  <Text style={styles.optionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Icon name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput 
              style={styles.modalInput} 
              value={editedMessageText} 
              onChangeText={setEditedMessageText}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editMessage}
                disabled={!editedMessageText.trim()}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messageList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    position: 'relative',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderTopRightRadius: 0,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  receivedTimestamp: {
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'left',
  },
  optionsButton: {
    position: 'absolute',
    right: -25,
    top: 0,
  },
  optionsMenu: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  sentOptionsMenu: {
    right: -25,
    top: 0,
  },
  receivedOptionsMenu: {
    left: -25,
    top: 0,
  },
  optionButton: {
    padding: 8,
  },
  optionText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 5,
    padding: 10,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
})

export default CustomerChat
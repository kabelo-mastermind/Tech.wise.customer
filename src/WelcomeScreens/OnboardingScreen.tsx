import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboarding } from '../constants/index';
import CustomButton from '../components/CustomButton';

const ONBOARDING_KEY = 'hasOnboarded';

const OnboardingScreen = ({ navigation }) => {
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Memoized onboarding completion handler
  const handleCompleteOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      navigation.replace('SignUp');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  }, [navigation]);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (hasOnboarded === 'true') {
          navigation.replace('SignUp');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [navigation]);

  // Memoized index change handler
  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Memoized next press handler
  const handleNextPress = useCallback(() => {
    const isLastSlide = currentIndex === onboarding.length - 1;
    
    if (isLastSlide) {
      handleCompleteOnboarding();
    } else {
      swiperRef.current?.scrollBy(1);
    }
  }, [currentIndex, handleCompleteOnboarding]);

  // Memoized slide renderer
  const renderSlide = useCallback((item) => {
    const isLastSlide = currentIndex === onboarding.length - 1;
    
    return (
      <View key={item.id} style={styles.slide}>
        {item.image ? (
          <Image 
            source={typeof item.image === 'string' ? { uri: item.image } : item.image} 
            style={styles.slideImage} 
          />
        ) : (
          <Text style={styles.slidePlaceholder}>No Image Available</Text>
        )}
        
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>

        <CustomButton
          title={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNextPress}
          bgVariant="none"
          textVariant="default"
          className={styles.cornerButton}
        />
      </View>
    );
  }, [currentIndex, handleNextPress]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={handleCompleteOnboarding}
        style={styles.skipButton}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Swiper
        ref={swiperRef}
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.activeDot} />}
        onIndexChanged={handleIndexChange}
        showsPagination={true}
        removeClippedSubviews={true}
      >
        {onboarding.map(renderSlide)}
      </Swiper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    alignSelf: 'flex-end',
    margin: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  dot: {
    width: 32,
    height: 4,
    marginHorizontal: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  activeDot: {
    width: 32,
    height: 4,
    marginHorizontal: 5,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  slideImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  slideDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  slidePlaceholder: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  cornerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
});

export default OnboardingScreen;
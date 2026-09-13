import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { Text } from '../src/components/ui/Text';
import { useRouter } from 'expo-router';
import { useSettings } from '../src/hooks/useSettings';
import { requestNotificationPermissions } from '../src/hooks/useNotifications';
import { BellRing, Target, Rocket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to\nHabit Tracker',
    subtitle: 'Small steps every day lead to massive changes over time. Ready to build better routines?',
    icon: <Target size={80} color="#C7F464" />,
    btnText: "Let's Begin",
  },
  {
    id: 'notifications',
    title: 'Stay on Track',
    subtitle: 'Enable notifications so we can gently remind you to complete your habits. You can always change this later.',
    icon: <BellRing size={80} color="#FF7849" />,
    btnText: 'Enable Notifications',
  },
  {
    id: 'ready',
    title: 'Ready for Liftoff!',
    subtitle: 'Your journey starts now. Let\'s create your very first habit and get the ball rolling.',
    icon: <Rocket size={80} color="#5AC8FA" />,
    btnText: 'Create First Habit',
  }
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { updateSetting } = useSettings();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    animateIn();
  }, [step]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      // Request notifications
      await requestNotificationPermissions();
      setStep(2);
    } else if (step === 2) {
      // Finish onboarding
      await updateSetting('hasCompletedOnboarding', true);
      router.replace('/create-habit');
    }
  };

  const handleSkip = async () => {
    if (step === 1) {
      setStep(2); // Skip notifications
    }
  };

  const currentStep = ONBOARDING_STEPS[step];

  return (
    <View style={styles.container}>
      {/* Background Graphic/Gradient */}
      <View style={styles.bgGraphic} />

      <View style={styles.content}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.iconWrapper}>
            {currentStep.icon}
          </View>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
        </Animated.View>
      </View>

      {/* Footer / Actions */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>{currentStep.btnText}</Text>
        </TouchableOpacity>

        {step === 1 ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
            <Text style={styles.secondaryBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.secondaryBtnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  bgGraphic: {
    position: 'absolute',
    top: -200,
    right: -100,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width,
    backgroundColor: '#C7F46410',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1C1C1F',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#B5B5B5',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272A',
  },
  dotActive: {
    backgroundColor: '#C7F464',
    width: 24,
  },
  primaryBtn: {
    backgroundColor: '#C7F464',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#707070',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtnPlaceholder: {
    height: 44, // Match height of secondaryBtn to prevent jumping
  }
});

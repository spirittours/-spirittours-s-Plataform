import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Checkbox,
  Divider,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTranslation} from 'react-i18next';

import {useAuth} from '../../contexts/AuthContext';
import {validateEmail} from '../../utils/validation';
import {theme} from '../../theme';
import Logo from '../../components/common/Logo';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

const LoginScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {login, loginWithGoogle, loginWithFacebook} = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = t('validation.emailRequired');
    } else if (!validateEmail(email)) {
      newErrors.email = t('validation.emailInvalid');
    }
    
    if (!password) {
      newErrors.password = t('validation.passwordRequired');
    } else if (password.length < 6) {
      newErrors.password = t('validation.passwordMinLength');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      // Navigation is handled by AuthContext
    } catch (error: any) {
      Alert.alert(
        t('auth.loginFailed'),
        error.message || t('auth.loginError'),
        [{text: t('common.ok')}]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithFacebook();
      }
    } catch (error: any) {
      Alert.alert(
        t('auth.socialLoginFailed'),
        error.message,
        [{text: t('common.ok')}]
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Surface style={styles.formContainer}>
          <Logo size="large" style={styles.logo} />
          
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
          
          <View style={styles.form}>
            <TextInput
              label={t('auth.email')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({...errors, email: undefined});
                }
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={!!errors.email}
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
            {errors.email && (
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
            )}
            
            <TextInput
              label={t('auth.password')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({...errors, password: undefined});
                }
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              error={!!errors.password}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />
            {errors.password && (
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
            )}
            
            <View style={styles.options}>
              <View style={styles.rememberMe}>
                <Checkbox
                  status={rememberMe ? 'checked' : 'unchecked'}
                  onPress={() => setRememberMe(!rememberMe)}
                  color={theme.colors.primary}
                />
                <Text style={styles.rememberText}>{t('auth.rememberMe')}</Text>
              </View>
              
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>
            
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              {t('auth.login')}
            </Button>
            
            <View style={styles.dividerContainer}>
              <Divider style={styles.divider} />
              <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
              <Divider style={styles.divider} />
            </View>
            
            <SocialLoginButtons
              onGoogleLogin={() => handleSocialLogin('google')}
              onFacebookLogin={() => handleSocialLogin('facebook')}
              loading={loading}
            />
            
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>{t('auth.dontHaveAccount')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={styles.signupLink}>{t('auth.signUp')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    borderRadius: 20,
    padding: 25,
    elevation: 4,
    backgroundColor: '#fff',
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  forgotPassword: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 25,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 12,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen;
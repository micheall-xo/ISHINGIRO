import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    web: 'http://localhost:5000/api',
    default: 'http://10.0.2.2:5000/api',
  });

function normalizeOptions(optionsOrMethod, body, headers) {
  if (typeof optionsOrMethod === 'string') {
    return {
      method: optionsOrMethod,
      body,
      headers: headers || {},
    };
  }
  return optionsOrMethod || {};
}

export const apiRequest = async (endpoint, optionsOrMethod = {}, body, headers) => {
  const options = normalizeOptions(optionsOrMethod, body, headers);
  const token = await AsyncStorage.getItem('token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body:
      options.body && !isFormData && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || 'API request failed';
    throw new Error(message);
  }

  return data;
};

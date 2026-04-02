import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getTrafficTimeAnalytics = async () => {
  const response = await api.get('/analytics/traffic-time')
  return response.data
}

export const getHolidayImpactAnalytics = async () => {
  const response = await api.get('/analytics/holiday-impact')
  return response.data
}

export const getRouteCongestionAnalytics = async () => {
  const response = await api.get('/analytics/route-congestion')
  return response.data
}

export const getDayTrafficAnalytics = async () => {
  const response = await api.get('/analytics/day-traffic')
  return response.data
}

export const getTrafficDistributionAnalytics = async () => {
  const response = await api.get('/analytics/traffic-distribution')
  return response.data
}

export const getTimePredictionsAnalytics = async () => {
  const response = await api.get('/analytics/time-predictions')
  return response.data
}

export const getModelEvaluation = async () => {
  const response = await axios.get('http://127.0.0.1:8000/model/evaluation')
  return response.data
}

export const getModelExplanation = async (payload) => {
  const response = await axios.post('http://127.0.0.1:8000/model/explain', payload)
  return response.data
}

export default api


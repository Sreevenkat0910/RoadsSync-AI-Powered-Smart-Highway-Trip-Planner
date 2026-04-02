import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getHolidayImpactAnalytics,
  getModelEvaluation,
  getRouteCongestionAnalytics,
  getTimePredictionsAnalytics,
  getTrafficDistributionAnalytics,
  getTrafficTimeAnalytics,
} from '../services/api'

const mockTrafficTimeData = [
  { date: '2024-11-10', trafficScore: 85 },
  { date: '2024-11-11', trafficScore: 60 },
  { date: '2024-11-12', trafficScore: 72 },
  { date: '2024-11-13', trafficScore: 67 },
  { date: '2024-11-14', trafficScore: 79 },
]

const mockTrafficDistribution = [
  { name: 'Low', value: 22 },
  { name: 'Medium', value: 44 },
  { name: 'High', value: 34 },
]

const mockHolidayData = [
  { name: 'Holiday Traffic', value: 62 },
  { name: 'Normal Traffic', value: 38 },
]

const mockRouteData = [
  { route: 'HYD-VJA', avgTraffic: 75 },
  { route: 'BLR-MYS', avgTraffic: 60 },
  { route: 'MUM-PUN', avgTraffic: 82 },
]

const mockDecisionData = [
  { label: 'Leave Now', delay: 45 },
  { label: 'Best Time', delay: 5 },
]

const mockTimePredictions = [
  { time: '04:00 AM', score: 20 },
  { time: '06:00 AM', score: 50 },
  { time: '08:00 AM', score: 80 },
  { time: '10:00 AM', score: 65 },
  { time: '12:00 PM', score: 60 },
  { time: '06:00 PM', score: 88 },
]

const TRAFFIC_COLORS = ['#16a34a', '#eab308', '#dc2626']
const HOLIDAY_COLORS = ['#dc2626', '#3b82f6']

export default function Dashboard() {
  const [trafficTime, setTrafficTime] = useState([])
  const [trafficDistribution, setTrafficDistribution] = useState([])
  const [holidayData, setHolidayData] = useState([])
  const [routeData, setRouteData] = useState([])
  const [timePredictions, setTimePredictions] = useState([])
  const [decisionData, setDecisionData] = useState(mockDecisionData)
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setErrorMessage('')

        const [trafficTimeRes, distributionRes, holidayRes, routeRes, predictionRes, evaluationRes] = await Promise.all([
          getTrafficTimeAnalytics(),
          getTrafficDistributionAnalytics(),
          getHolidayImpactAnalytics(),
          getRouteCongestionAnalytics(),
          getTimePredictionsAnalytics(),
          getModelEvaluation(),
        ])

        setTrafficTime(Array.isArray(trafficTimeRes) ? trafficTimeRes : [])
        setTrafficDistribution(Array.isArray(distributionRes) ? distributionRes : [])
        setHolidayData(
          Array.isArray(holidayRes)
            ? holidayRes.map((item) => ({
                name: item.isHoliday === 'Yes' ? 'Holiday Traffic' : 'Normal Traffic',
                value: item.avgTraffic,
              }))
            : []
        )
        setRouteData(Array.isArray(routeRes) ? routeRes : [])
        setTimePredictions(Array.isArray(predictionRes) ? predictionRes : [])
        setEvaluation(evaluationRes || null)
      } catch (error) {
        setErrorMessage('Analytics API unavailable. Showing mock dashboard data.')
        setTrafficTime(mockTrafficTimeData)
        setTrafficDistribution(mockTrafficDistribution)
        setHolidayData(mockHolidayData)
        setRouteData(mockRouteData)
        setTimePredictions(mockTimePredictions)
        setDecisionData(mockDecisionData)
        setEvaluation(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <section className="premium-card animate-[fadeIn_.35s_ease-out]">
        <p className="text-sm font-medium text-[#6B6B6B]">Loading dashboard...</p>
      </section>
    )
  }

  const confusionMatrix = Array.isArray(evaluation?.rf_confusion_matrix) ? evaluation.rf_confusion_matrix : []
  const confusionLabels = Array.isArray(evaluation?.rf_labels) ? evaluation.rf_labels : []
  const metricBars = [
    { metric: 'RF Accuracy', value: Number(((evaluation?.rf_accuracy || 0) * 100).toFixed(2)) },
    { metric: 'LSTM RMSE', value: Number((evaluation?.lstm_rmse || 0).toFixed(2)) },
  ]

  return (
    <section className="space-y-6">
      <div className="premium-card animate-[fadeIn_.35s_ease-out]">
        <h1 className="text-2xl font-semibold text-[#2E2E2E]">Traffic Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Multi-chart analytics across time, holiday impact, routes, and day-of-week traffic.
        </p>
        {errorMessage && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="premium-card">
        <h2 className="text-lg font-semibold text-[#2E2E2E]">Model Evaluation</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">Random Forest and LSTM performance snapshot</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4">
            <p className="text-xs uppercase tracking-wide text-[#6B6B6B]">Accuracy</p>
            <p className="mt-1 text-2xl font-semibold text-[#4B2E2E]">
              {evaluation ? `${((evaluation.rf_accuracy || 0) * 100).toFixed(2)}%` : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl border border-[#E9DFD7] bg-[#FCFAF8] p-4">
            <p className="text-xs uppercase tracking-wide text-[#6B6B6B]">RMSE</p>
            <p className="mt-1 text-2xl font-semibold text-[#4B2E2E]">
              {evaluation ? (evaluation.lstm_rmse || 0).toFixed(2) : 'N/A'}
            </p>
          </div>
        </div>

        {evaluation && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B6B6B]">Confusion Matrix</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse overflow-hidden rounded-lg border border-[#E9DFD7] text-sm">
                <thead>
                  <tr className="bg-[#F7F1EA] text-[#4B2E2E]">
                    <th className="px-3 py-2 text-left">Actual \ Pred</th>
                    {confusionLabels.map((label) => (
                      <th key={`head-${label}`} className="px-3 py-2 text-left">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {confusionMatrix.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`} className="border-t border-[#E9DFD7] bg-white">
                      <td className="px-3 py-2 font-medium text-[#6F4E37]">{confusionLabels[rowIndex] || `Class ${rowIndex + 1}`}</td>
                      {row.map((cell, colIndex) => (
                        <td key={`cell-${rowIndex}-${colIndex}`} className="px-3 py-2 text-[#2E2E2E]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#6F4E37" name="Metric Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Traffic Distribution (ML Predictions)</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trafficDistribution} dataKey="value" nameKey="name" outerRadius={95}>
                  {trafficDistribution.map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={TRAFFIC_COLORS[idx % TRAFFIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Majority of traffic falls into medium/high categories.
          </p>
        </article>

        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Traffic Trend Over Time</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="trafficScore" stroke="#2563eb" fill="#93c5fd" name="Traffic Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Traffic increases during peak travel hours.
          </p>
        </article>

        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Delay Comparison (Decision Impact)</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decisionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delay" fill="#ef4444" name="Delay (mins)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Choosing optimal departure reduces delay significantly.
          </p>
        </article>

        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Route Congestion Comparison</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="route" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgTraffic" fill="#dc2626" name="Avg Traffic" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Certain routes consistently show higher congestion.
          </p>
        </article>

        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Traffic Prediction Across Time Slots</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timePredictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={3} name="Predicted Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Early morning travel minimizes congestion.
          </p>
        </article>

        <article className="premium-card">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">Holiday Impact on Traffic</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={holidayData} dataKey="value" nameKey="name" outerRadius={95}>
                  {holidayData.map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={HOLIDAY_COLORS[idx % HOLIDAY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm italic text-[#6B6B6B]">
            Holidays show significantly higher traffic levels than regular days.
          </p>
        </article>
      </div>

      <div className="premium-card">
        <h2 className="text-lg font-semibold text-[#2E2E2E]">Key Insights</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm italic text-emerald-800">Traffic peaks significantly during festival periods like Diwali.</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm italic text-blue-800">Weekend traffic is consistently higher than weekdays.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm italic text-amber-800">Certain routes show consistently higher congestion.</p>
          </div>
        </div>
      </div>
    </section>
  )
}


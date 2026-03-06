import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

app.post('/api/chat', async (req, res) => {
  const { history, message } = req.body

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(message)
    const text = result.response.text()

    res.json({ reply: text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// One turn in a self-chat — each side has its own system prompt + history
app.post('/api/self-chat-turn', async (req, res) => {
  const { systemPrompt, history, message } = req.body

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(message)
    res.json({ reply: result.response.text() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Convert raw PCM (L16, 24kHz, mono) to WAV by prepending a WAV header
function pcmToWav(pcmBase64, sampleRate = 24000) {
  const pcm = Buffer.from(pcmBase64, 'base64')
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcm.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)              // PCM
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcm]).toString('base64')
}

// Gemini TTS — uses the same API key as the chat endpoints
// Puck = upbeat male, Kore = firm female
const TTS_VOICES = { A: 'Puck', B: 'Kore' }

app.post('/api/tts', async (req, res) => {
  const { text, persona } = req.body
  const apiKey = process.env.GEMINI_API_KEY
  const voice = TTS_VOICES[persona] || 'Puck'

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: voice } },
            },
          },
        }),
      }
    )
    const data = await response.json()
    console.log('TTS response status:', response.status)
    console.log('TTS data keys:', Object.keys(data))
    if (data.error) throw new Error(data.error.message)
    const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData
    console.log('Audio mimeType:', audio?.mimeType, 'data length:', audio?.data?.length)
    if (!audio) throw new Error('No audio returned')
    const wavBase64 = pcmToWav(audio.data)
    res.json({ audioContent: wavBase64, mimeType: 'audio/wav' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Imagen 4 image generation
app.post('/api/image', async (req, res) => {
  const { prompt } = req.body
  const apiKey = process.env.GEMINI_API_KEY

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '16:9' },
        }),
      }
    )
    const data = await response.json()
    console.log('Imagen response:', JSON.stringify(data).slice(0, 500))
    if (data.error) throw new Error(data.error.message)
    const imageData = data.predictions?.[0]?.bytesBase64Encoded
    const mimeType = data.predictions?.[0]?.mimeType || 'image/jpeg'
    if (!imageData) throw new Error('No image returned')
    res.json({ imageData, mimeType })
  } catch (err) {
    console.error('Image error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(3001, () => console.log('Server running on http://localhost:3001'))

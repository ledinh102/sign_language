'use client'
import { MicNoneRounded, MicOffRounded, VideocamOffRounded, VideocamRounded } from '@mui/icons-material'
import { Box, Button, Card, IconButton, Stack } from '@mui/material'
import {
  LocalUser,
  RemoteUser,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteAudioTracks,
  useRemoteUsers
} from 'agora-rtc-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'
import Webcam from 'react-webcam'

export default function Videos(props: { channelName: string; AppID: string }) {
  const router = useRouter()
  const userType = useSearchParams().get('user')
  const { AppID, channelName } = props
  const [micOn, setMic] = useState(userType === 'dd' ? false : true)
  const [cameraOn, setCamera] = useState(true)
  const { isLoading: isLoadingMic, localMicrophoneTrack } = useLocalMicrophoneTrack(micOn)
  const { isLoading: isLoadingCam, localCameraTrack } = useLocalCameraTrack(cameraOn)
  const remoteUsers = useRemoteUsers()
  const { audioTracks } = useRemoteAudioTracks(remoteUsers)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [query, setQuery] = useState('')

  // Webcam and Media Recorder refs and state
  const webcamRef = useRef<Webcam>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [capturing, setCapturing] = useState<boolean>(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [uploading, setUploading] = useState<boolean>(false)

  // Establish websocket connection
  useEffect(() => {
    const clientID = Date.now()
    const socket = new WebSocket(`ws://localhost:8000/video-call/${clientID}`)
    setWs(socket)

    socket.onmessage = function (event) {
      console.log('query: ', event.data)
      setQuery(encodeURIComponent(event.data))
    }
  }, [channelName])
  // Capture handlers
  const handleDataAvailable = useCallback(
    ({ data }: { data: BlobPart }) => {
      if (data instanceof Blob && data.size > 0) {
        setRecordedChunks(prev => [...prev, data])
      }
    },
    [setRecordedChunks]
  )
  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true)
    if (webcamRef.current) {
      const stream: MediaStream | undefined = webcamRef.current.stream!
      if (stream) {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm'
        })
        mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable)
        mediaRecorderRef.current.start()
      }
    }
  }, [webcamRef, setCapturing, mediaRecorderRef, handleDataAvailable])

  const handleUpload = useCallback(async () => {
    console.log(recordedChunks)
    if (recordedChunks.length) {
      try {
        setUploading(true)
        const filename = 'recorded_video.webm'
        const blob = new Blob(recordedChunks, {
          type: 'video/webm'
        })
        const formData = new FormData()
        formData.append('video', blob, filename)

        const response = await fetch('http://localhost:8000/translate/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          console.log('Video uploaded successfully')
        } else {
          console.error('Failed to upload video')
        }
      } catch (error) {
        console.error('Error uploading video:', error)
      } finally {
        setUploading(false)
        setRecordedChunks([])
      }
    }
  }, [recordedChunks])

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setCapturing(false)
      handleUpload()
    }
  }, [mediaRecorderRef, setCapturing, handleUpload])

  // Join Agora RTC channel
  usePublish([localMicrophoneTrack, localCameraTrack])
  useJoin({ appid: AppID, channel: channelName, token: null })

  audioTracks.map(track => track.play())
  const deviceLoading = isLoadingMic || isLoadingCam
  if (deviceLoading) return <div>Loading devices...</div>

  return (
    <Box width='780px' mx='auto' pt={2} position='relative'>
      <Card sx={{ width: '100%', aspectRatio: 4 / 3 }}>
        {userType === 'dd' && query && (
          <Card sx={{ position: 'absolute', zIndex: 5, width: '200px', left: 20, top: 36 }}>
            {createElement('pose-viewer', {
              loop: true,
              src: `https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose?text=${query}&spoken=en&signed=ase`
            })}
          </Card>
        )}
        <Card
          sx={
            remoteUsers.length === 1
              ? { position: 'absolute', zIndex: 5, width: '200px', aspectRatio: 4 / 3, right: 20, top: 36 }
              : { height: '100%' }
          }
        >
          <LocalUser
            audioTrack={localMicrophoneTrack}
            videoTrack={localCameraTrack}
            cameraOn={cameraOn}
            micOn={micOn}
            playAudio={micOn}
            playVideo={cameraOn}
          />
        </Card>
        {remoteUsers.map(user => (
          <Box key={user.uid} sx={{ width: '100%', height: '100%' }}>
            <RemoteUser user={user} />
          </Box>
        ))}
      </Card>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        sx={{
          position: 'absolute',
          width: '100%',
          px: 3,
          height: '80px',
          bottom: 0,
          backgroundColor: 'rgba(0,0,0, 0.4)',
          borderRadius: 1,
          zIndex: 3
        }}
      >
        <Box>
          <IconButton color={micOn ? 'info' : 'error'} onClick={() => setMic(prevMicOn => !prevMicOn)}>
            {micOn ? <MicNoneRounded /> : <MicOffRounded />}
          </IconButton>
          <IconButton color={cameraOn ? 'info' : 'error'} sx={{ ml: 2 }} onClick={() => setCamera(prev => !prev)}>
            {cameraOn ? <VideocamRounded /> : <VideocamOffRounded />}
          </IconButton>
          <IconButton color='info' sx={{ ml: 2 }} onClick={handleStartCaptureClick}>
            Start Capture
          </IconButton>
          <IconButton color='error' sx={{ ml: 2 }} onClick={handleStopCaptureClick}>
            Stop Capture
          </IconButton>
        </Box>
        <Button
          variant='contained'
          color='error'
          onClick={() => {
            router.push('/video-call')
          }}
        >
          End
        </Button>
      </Stack>
      <Webcam audio={false} ref={webcamRef} style={{ display: 'none' }} />
    </Box>
  )
}

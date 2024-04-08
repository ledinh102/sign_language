'use client'
import { MicNoneRounded } from '@mui/icons-material'
import { Box, IconButton, Stack, TextField, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'
import styles from './content.module.scss'
import Webcam from 'react-webcam'
import Image from 'next/image'

export interface ContentProps {
  isRevert: boolean
  isWebcamOn: boolean
}

const url = process.env.NEXT_PUBLIC_SUGGEST_TEXT_URL

export default function Content({ isRevert, isWebcamOn }: ContentProps) {
  const [text, setText] = useState('')
  const [suggest, setSuggest] = useState('')
  const [query] = useDebounce(encodeURIComponent(text), 1000)
  const router = useRouter()
  const webcamRef = useRef<Webcam | null>(null)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  // const createSuggestText = async () => {
  // if (url) {
  //   const res = await fetch(url, {
  //     method: 'POST',
  //     headers: {
  //       'content-type': 'application/x-www-form-urlencoded',
  //       'X-RapidAPI-Key': process.env.NEXT_PUBLIC_SUGGEST_KEY!,
  //       'X-RapidAPI-Host': 'textgears-textgears-v1.p.rapidapi.com'
  //     },
  //     body: new URLSearchParams({
  //       text: decodeURIComponent(query)
  //     })
  //   })
  //   const result = await res.text()
  //   const result = {
  //     response: {
  //       errors: [
  //         {
  //           bad: 'is',
  //           better: ['am'],
  //           description: {
  //             en: 'Did you mean "am"?'
  //           },
  //           id: 'e1538460279',
  //           length: 2,
  //           offset: 2,
  //           type: 'grammar'
  //         },
  //         {
  //           bad: 'engeneer',
  //           better: ['engineer', 'engender'],
  //           description: {
  //             en: 'Possible spelling mistake found'
  //           },
  //           id: 'e409777493',
  //           length: 8,
  //           offset: 8,
  //           type: 'spelling'
  //         }
  //       ],
  //       result: true
  //     },
  //     status: true
  //   }

  //   if (result.response.errors.length === 0) {
  //     return
  //   }
  //   let newText = 'My mother are a doctor, but my father is a angeneer. I has a gun.'
  //   console.log(newText)
  //   setSuggest(newText)
  // }

  // useEffect(() => {
  //   const { search } = window.location
  //   if (search != '') {
  //     const query = search.split('=')[1]
  //     setText(decodeURIComponent(query))
  //   }
  //   ;(async function () {
  //     await createSuggestText()
  //   })()
  // }, [])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newText = e.target.value
    if (newText.length <= 500) {
      setSuggest('')
      setText(newText)
      router.push(newText ? `/?text=${encodeURIComponent(newText)}` : '/')
    }
  }

  const displayPhoto = async (data: string) => {
    console.log(data)
    try {
      const formData = new FormData()
      formData.append('my_file', dataURLtoFile(data, 'photo.png'))
      const response = await fetch('http://127.0.0.1:8000/file', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) {
        throw new Error('Failed to upload photo')
      }
      const responseData = await response.json()
      const base64String = responseData.image_base64
      // photo.setAttribute('src', 'data:image/png;base64,' + base64String)
      setImgSrc('data:image/png;base64,' + base64String)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const dataURLtoFile = (dataURL: string, filename: string) => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const capture = useCallback(async () => {
    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc) {
          await displayPhoto(imageSrc)
        } else {
          console.error('Failed to capture image: Screenshot is null')
        }
      } catch (error) {
        console.error('Error capturing image:', error)
      }
    } else {
      console.error('Webcam reference is null')
    }
  }, [webcamRef, displayPhoto])

  useEffect(() => {
    const interval = setInterval(capture, 500)
    return () => clearInterval(interval)
  })

  return (
    <Stack direction='row' spacing={1.5}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      >
        {isRevert ? (
          <Box className={styles.webcamContainer}>
            {isWebcamOn ? (
              <Webcam
                ref={webcamRef}
                className={styles.webcam}
                audio={false}
                screenshotFormat='image/jpeg'
                videoConstraints={{
                  facingMode: 'user'
                }}
              />
            ) : null}
          </Box>
        ) : (
          <TextField
            multiline
            rows={14}
            fullWidth
            defaultValue={text}
            value={text}
            InputProps={{
              sx: {
                borderRadius: '12px',
                fontSize: '1.2rem'
              }
            }}
            onChange={handleTextChange}
          />
        )}
        {/* <Typography>{suggest}</Typography> */}
        {isRevert ? null : (
          <>
            <IconButton sx={{ position: 'absolute', bottom: 4, left: 4 }}>
              <MicNoneRounded />
            </IconButton>
            <Typography
              component='span'
              variant='body1'
              sx={{ color: 'GrayText', fontSize: '0.8rem', position: 'absolute', bottom: 12, right: 20 }}
            >
              {`${text.length} / 500`}
            </Typography>
          </>
        )}
      </Box>
      <Box
        sx={{
          width: '100%',
          background: 'rgba(0,0,0, 0.1)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Box
          width={isRevert ? '100%' : '74%'}
          height={isRevert ? '100%' : '90%'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {imgSrc ? <Image className={styles.imgResult} src={imgSrc!} fill={true} alt='Picture of the author' /> : null}
          <pose-viewer
            loop
            src={
              text &&
              `https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose?text=${query}&spoken=en&signed=ase`
            }
          />
        </Box>
        {/* <Typography>{query}</Typography> */}
      </Box>
    </Stack>
  )
}

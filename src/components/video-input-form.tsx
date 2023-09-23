import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status =
    | 'waiting'
    | 'converting'
    | 'uploading'
    | 'generating'
    | 'success'
    | 'error'
const statusMessage: Record<Status, string> = {
    converting: 'Convertendo...',
    generating: 'Trancrevendo...',
    uploading: 'Enviando...',
    success: 'Transcrição concluída!',
    error: 'Ocorreu um erro!',
    waiting: 'Aguardando...',
}
interface VideoInputFormProps {
    onVideoUploaded: (Id: string) => void
  }
export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [status, setStatus] = useState<Status>('waiting');
    const promptInputRef = useRef<HTMLTextAreaElement>(null)
    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget

        if (!files) {
            return
        }
        const selectedFile = files[0]
        setVideoFile(selectedFile)
    }

    const previewURL = useMemo(() => {
        if (!videoFile) return null

        return URL.createObjectURL(videoFile)
    }, [videoFile])

    async function convertVideoToAudio(video: File) {
        console.log("convert started ")

        const ffmpeg = await getFFmpeg()

        // add file  ffmpeg  context
        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        ffmpeg.on('progress', progress => {

            console.log("convert progress: " + Math.round(progress.progress * 100))
        })

        // how make a insert with mongodb ?
        //array de comandos que serão concatenados em apenas 1
        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3',
        ])
        // lê o arquivo  output.mp3 e retorna um FileData
        const data = await ffmpeg.readFile('output.mp3')

        // converte de FileData para Blob
        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
        // converte de Blob para File mp3 
        const audioFile = new File([audioFileBlob], 'audio.mp3', { type: 'audio/mpeg' })

        console.log("convert finish")

        return audioFile

    }
    async function handleUploadVideo(event: FormEvent<HTMLElement>) {
        event.preventDefault()

        const prompt = promptInputRef.current?.value

        if (!videoFile) {
            return
        }

        setStatus('converting')

        const audioFile = await convertVideoToAudio(videoFile)

        console.log("audioFile", audioFile)

        const data = new FormData()
        data.append('file', audioFile)

        setStatus('uploading')

        const response = await api.post('/videos', data)
        const videoId = response.data.video.id

        console.log("video id", videoId)

        setStatus('generating')

        await api.post(`videos/${videoId}/transcription`, {
            prompt,
        })

        setStatus('success')

        onVideoUploaded(videoId)

    }

    return (
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label htmlFor="videoInput"
                className=" relative border flex w-full rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col items-center justify-center text-muted-foreground hover:bg-primary/5 "
            >
                {previewURL ? (
                    <video src={previewURL} controls={false} className="w-full h-full pointer-events-none absolute inset-0" />
                ) : (
                    <>
                        <FileVideo className="w-6 h-6" />
                        selecione um vídeo
                    </>
                )}
            </label>
            <input type="file" id="videoInput" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />
            <Separator />
            <div className="space-y-2">
                <Label htmlFor="transcription_prompt" >Prompt de transcrição</Label>
                <Textarea disabled={status !== "waiting"} ref={promptInputRef} id="transcription_prompt" className="h-20 leading-relaxed resize-none" placeholder="Inclua palavras-chaves mencionadas no vídeo separada por virgula ( , )" />
            </div>
            <Button 
                data-success={status === 'success'}
                disabled={status !== "waiting"} 
                type="submit" 
                className="w-full data-[success=true]:bg-emerald-400">
                {status === 'waiting' ? (
                    <>
                        Carregar vídeo <Upload className="w-4 h-4 ml-2" />
                    </>
                ) : (
                    statusMessage[status]
                )}

            </Button>
        </form>

    )
}
import { FolderPicker } from '@/components/ui/folder-picker'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerOutput,
  ColorPickerFormat,
} from '@/components/ui/shadcn-io/color-picker'
import { SliderNumberInput } from '@/components/ui/slider-number-input'
import { Label } from '@radix-ui/react-label'
import { createFileRoute } from '@tanstack/react-router'
import {
  Route as RouteIcon,
  Server,
  Shield,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react'
import React from 'react'
import Color from 'color'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [radius, setRadius] = React.useState(33)
  const [stroke, setStroke] = React.useState(33)
  const [color, setColor] = React.useState('#000000ff')

  return (
    <div className="display flex justify-between items-center h-[calc(100vh-2rem)] my-4">
      <div
        id="video-div"
        className="outline-1 outline-red-600 ml-5 h-full flex-1"
      >
        <h1> Wazzap </h1>
      </div>
      <div
        id="settings-div"
        className="display flex flex-col gap-2 p-5 mx-5 border h-full w-96 rounded-lg"
      >
        <Label className="text-md font-bold mb-2"> Setup </Label>
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          XR Video (Scene Video){' '}
        </Label>
        <Input
          id="xr-file-upload"
          type="file"
          className="text-muted-foreground"
        />
        <Label className="text-sm" htmlFor="neon-gaze-upload">
          {' '}
          Neon Gaze Data{' '}
        </Label>
        <FolderPicker
          onPick={(f) => {
            console.log(f)
          }}
        />
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2"> Align </Label>
        <Label className="text-sm" htmlFor="gaze-start-time">
          {' '}
          Gaze Start Time{' '}
        </Label>
        <div id="gaze-start-time" className="flex flex-row items-center gap-2">
          <Input
            id="m-gst"
            type="number"
            placeholder="min"
            min={0}
            max={9999}
            className="w-18"
          />
          :
          <Input
            id="s-gst"
            type="number"
            placeholder="sec"
            min={0}
            max={59}
            className="w-16"
          />
          :
          <Input
            id="ms-gst"
            type="number"
            placeholder="ms"
            min={0}
            max={999}
            className="w-17"
          />
        </div>
        <Separator className="mt-4 mb-2" />
        <Label className="text-md font-bold mb-2">
          {' '}
          Gaze Visualizer Style{' '}
        </Label>
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Radius{' '}
        </Label>
        <SliderNumberInput
          value={radius}
          onValueChange={setRadius}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Stroke Width{' '}
        </Label>
        <SliderNumberInput
          value={stroke}
          onValueChange={setStroke}
          min={1}
          max={100}
        />
        <Label className="text-sm" htmlFor="xr-file-upload">
          {' '}
          Color{' '}
        </Label>
        <ColorPicker
          defaultValue={color}
          onChange={(v) => {
            const c = Color(v)
            console.log(c.hexa())
            setColor(c.hexa())
            // setColor([v[0], v[1], v[2], v[3]]);
          }}
          className="max-w-sm rounded-md border bg-background p-4 shadow-sm"
        >
          <ColorPickerSelection />
          <div className="flex items-center gap-4">
            <ColorPickerEyeDropper />
            <div className="grid w-full gap-1">
              <ColorPickerHue />
              <ColorPickerAlpha />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
      </div>
    </div>
  )
}

function App2() {
  const features = [
    {
      icon: <Zap className="w-12 h-12 text-cyan-400" />,
      title: 'Powerful Server Functions',
      description:
        'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
    },
    {
      icon: <Server className="w-12 h-12 text-cyan-400" />,
      title: 'Flexible Server Side Rendering',
      description:
        'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
    },
    {
      icon: <RouteIcon className="w-12 h-12 text-cyan-400" />,
      title: 'API Routes',
      description:
        'Build type-safe API endpoints alongside your application. No separate backend needed.',
    },
    {
      icon: <Shield className="w-12 h-12 text-cyan-400" />,
      title: 'Strongly Typed Everything',
      description:
        'End-to-end type safety from server to client. Catch errors before they reach production.',
    },
    {
      icon: <Waves className="w-12 h-12 text-cyan-400" />,
      title: 'Full Streaming Support',
      description:
        'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
    },
    {
      icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
      title: 'Next Generation Ready',
      description:
        'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/tanstack-circle-logo.png"
              alt="TanStack Logo"
              className="w-24 h-24 md:w-32 md:h-32"
            />
            <h1 className="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.08em]">
              <span className="text-gray-300">TANSTACK</span>{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                START
              </span>
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            The framework for next generation AI applications
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Full-stack framework powered by TanStack Router for React and Solid.
            Build modern applications with server functions, streaming, and type
            safety.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
            >
              Documentation
            </a>
            <p className="text-gray-400 text-sm mt-2">
              Begin your TanStack Start journey by editing{' '}
              <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400">
                /src/routes/index.tsx
              </code>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

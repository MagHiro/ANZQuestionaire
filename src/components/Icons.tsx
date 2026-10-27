import type { ComponentType, SVGProps } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
  PlayIcon,
  SparklesIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  Squares2X2Icon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChevronDownIcon,
  Square3Stack3DIcon,
  Bars3BottomLeftIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }
function icon(Component: ComponentType<SVGProps<SVGSVGElement>>) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return <Component width={size} height={size} aria-hidden="true" {...props} />
  }
}

export const ArrowLeft = icon(ArrowLeftIcon)
export const ArrowRight = icon(ArrowRightIcon)
export const ArrowUpRight = icon(ArrowUpRightIcon)
export const Upload = icon(ArrowUpTrayIcon)
export const Download = icon(ArrowDownTrayIcon)
export const Undo2 = icon(ArrowUturnLeftIcon)
export const Plus = icon(PlusIcon)
export const Play = icon(PlayIcon)
export const Sparkles = icon(SparklesIcon)
export const Trash2 = icon(TrashIcon)
export const Check = icon(CheckIcon)
export const X = icon(XMarkIcon)
export const Command = icon(Squares2X2Icon)
export const CircleCheck = icon(CheckCircleIcon)
export const MessageSquare = icon(ChatBubbleLeftRightIcon)
export const GripVertical = icon(Bars3Icon)
export const CalendarDays = icon(CalendarDaysIcon)
export const ChevronDown = icon(ChevronDownIcon)
export const Layers = icon(Square3Stack3DIcon)
export const Text = icon(Bars3BottomLeftIcon)
export const List = icon(ListBulletIcon)

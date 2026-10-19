'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/context/auth-context';
import { useTimer } from '@/context/timer-context';
import { createClient } from '@/lib/supabase/client';
import { MOCK_COMPANIES, MOCK_PROFILES } from '@/lib/mock-data';
import { Company, Profile } from '@/types/database';
import { canUserAccessHubApp } from '@/lib/hub-apps';
import { 
  TaskFlowItem, 
  TaskPriority, 
  TaskStatus, 
  TaskList,
  DEFAULT_TASK_LISTS,
  downloadAllEventsIcs 
} from '@/lib/calendar-export';
import { NativeCalendar } from '@/components/taskflow/native-calendar';
import { PostItBoard } from '@/components/taskflow/post-it-board';
import { TaskListView } from '@/components/taskflow/task-list-view';
import { TaskModal } from '@/components/taskflow/task-modal';
import { PostItItem } from '@/types/postit';
import { useNotifications } from '@/context/notifications-context';
import { 
  CheckSquare, 
  Plus, 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Building2, 
  Tag, 
  Trash2, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  Sparkles,
  Filter,
  Search,
  Users,
  Download,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  List,
  RotateCw,
  FolderPlus,
  Layers,
  StickyNote
} from 'lucide-react';

const STORAGE_KEY_ITEMS_V2 = 'bug_taskflow_items_v2';
const STORAGE_KEY_POSTITS = 'bug_taskflow_postits_v1';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getFutureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

const SEED_POST_ITS: PostItItem[] = [
  {
    id: 'postit-seed-1',
    title: 'Revisión cuotas y contratos anuales clientes',
    content: 'Revisar la renovación de contratos con los clientes clave de la agencia antes del nuevo ciclo. Preparar propuesta de actualización de tarifas.',
    targetDate: getFutureDateString(30),
    targetTime: '10:00',
    color: 'yellow',
    isPinned: true,
    isCompleted: false,
    reminders: [
      { id: 'rem-20d', label: '20 días antes', offsetMinutes: 20 * 24 * 60 },
      { id: 'rem-15d', label: '15 días antes', offsetMinutes: 15 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
      { id: 'rem-1h', label: '1 hora antes', offsetMinutes: 60 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'postit-seed-2',
    title: 'Cierre mensual de horas y facturación',
    content: 'Confirmar con los empleados que todas las horas en Brain Up Clockify estén imputadas a proyectos antes del día 30.',
    targetDate: getFutureDateString(14),
    targetTime: '18:00',
    color: 'pink',
    isPinned: true,
    isCompleted: false,
    reminders: [
      { id: 'rem-7d', label: '7 días antes (1 sem)', offsetMinutes: 7 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'postit-seed-3',
    title: 'Sesión de brainstorming trimestral',
    content: 'Definir nuevas plantillas creativas para redes de clientes del sector restauración y automoción.',
    targetDate: getFutureDateString(21),
    targetTime: '11:00',
    color: 'green',
    isPinned: false,
    isCompleted: false,
    reminders: [
      { id: 'rem-3d', label: '3 días antes', offsetMinutes: 3 * 24 * 60 },
      { id: 'rem-1d', label: '1 día antes', offsetMinutes: 1 * 24 * 60 },
    ],
    createdAt: new Date().toISOString(),
  },
];

function getWeekDayDate(dayIndex: number): string {
  // dayIndex: 0 = Lunes, 1 = Martes, 2 = Miércoles, 3 = Jueves, 4 = Viernes, 5 = Sábado, 6 = Domingo
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  const target = new Date(monday);
  target.setDate(monday.getDate() + dayIndex);
  return target.toISOString().split('T')[0];
}

const SEED_TASKFLOW_ITEMS: TaskFlowItem[] = [
  // Lunes (Día 0)
  {
    id: 'tf-seed-mon-1',
    type: 'task',
    title: 'FIESTA ESTATAL',
    companyName: 'Brain Up Interno',
    status: 'done',
    priority: 'baja',
    colorStrip: 'yellow',
    date: getWeekDayDate(0),
    createdBy: 'Equipo Brain Up',
    isShared: true,
    assignees: ['Todos'],
    createdAt: getWeekDayDate(0),
  },

  // Martes (Día 1)
  {
    id: 'tf-seed-tue-1',
    type: 'meeting',
    title: 'DENILSON (BNI)',
    companyName: 'BNI Networking',
    status: 'in_progress',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(1),
    startTime: '11:00',
    endTime: '12:00',
    location: 'Google Meet',
    createdBy: 'Equipo Brain Up',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-2',
    type: 'meeting',
    title: 'ALBERT BARCELÓ (BUG): reunión',
    companyName: 'Brain Up Grup',
    status: 'in_progress',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(1),
    startTime: '12:30',
    endTime: '13:30',
    location: 'Oficina Central BUG',
    createdBy: 'Albert Barceló',
    isShared: true,
    assignees: ['Albert Barceló', 'Alejandro Ramos'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-3',
    type: 'task',
    title: 'EL7: Nadal i Sant Esteve CAT + carta para web + s/f diseño menús',
    companyName: 'EL7 Menús',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(1),
    estimatedHours: 2.5,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Diseño BUG'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-4',
    type: 'task',
    title: 'VERITY: s/f xxxxx octubre',
    companyName: 'Verity Brands',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(1),
    estimatedHours: 1.5,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-5',
    type: 'task',
    title: 'SANTOS: idiomas mss + publicitat exterior + planificar + formulari',
    companyName: 'Santos Muebles',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'yellow',
    date: getWeekDayDate(1),
    estimatedHours: 3,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-6',
    type: 'task',
    title: 'PONT: creativitats novembre',
    companyName: 'Pont Assegurances',
    status: 'todo',
    priority: 'media',
    colorStrip: 'orange',
    date: getWeekDayDate(1),
    estimatedHours: 2,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Equipo Creativo'],
    createdAt: getWeekDayDate(1),
  },
  {
    id: 'tf-seed-tue-7',
    type: 'task',
    title: 'PONT: s/f lots de nadal',
    companyName: 'Pont Assegurances',
    status: 'done',
    priority: 'baja',
    colorStrip: 'white',
    date: getWeekDayDate(1),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(1),
  },

  // Miércoles (Día 2)
  {
    id: 'tf-seed-wed-1',
    type: 'meeting',
    title: 'BNI',
    companyName: 'BNI Networking',
    status: 'done',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(2),
    startTime: '06:30',
    endTime: '08:30',
    location: 'Presencial BNI',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-2',
    type: 'meeting',
    title: 'TALAIOT (BUG): consultoría',
    companyName: 'Talaiot Media',
    status: 'in_progress',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(2),
    startTime: '10:00',
    endTime: '11:00',
    location: 'Google Meet',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Consultoría BUG'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-3',
    type: 'meeting',
    title: 'INBOKEAPP (ONLINE): BNI',
    companyName: 'Inboke App',
    status: 'todo',
    priority: 'media',
    colorStrip: 'pink',
    date: getWeekDayDate(2),
    startTime: '15:00',
    endTime: '15:30',
    location: 'Google Meet',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-4',
    type: 'meeting',
    title: 'GABRIELA (ONLINE)',
    companyName: 'Gabriela Estilistas',
    status: 'todo',
    priority: 'media',
    colorStrip: 'pink',
    date: getWeekDayDate(2),
    startTime: '15:30',
    endTime: '16:00',
    location: 'Google Meet',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-5',
    type: 'meeting',
    title: 'MANU NIÑOS TARDE',
    companyName: 'Manu Coaching',
    status: 'todo',
    priority: 'media',
    colorStrip: 'pink',
    date: getWeekDayDate(2),
    startTime: '17:00',
    endTime: '18:00',
    location: 'Presencial',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-6',
    type: 'task',
    title: 'ASOVALL: Art 1 Octubre como no se pudo publicar, qué sugieres...',
    companyName: 'Asovall Asoc',
    status: 'todo',
    priority: 'media',
    colorStrip: 'blue',
    date: getWeekDayDate(2),
    estimatedHours: 1.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-7',
    type: 'task',
    title: 'EL7: modificación menús',
    companyName: 'EL7 Menús',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'blue',
    date: getWeekDayDate(2),
    estimatedHours: 1,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Diseño BUG'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-8',
    type: 'task',
    title: 'PONT: catàleg digital cat/cast',
    companyName: 'Pont Assegurances',
    status: 'todo',
    priority: 'media',
    colorStrip: 'orange',
    date: getWeekDayDate(2),
    estimatedHours: 2,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },
  {
    id: 'tf-seed-wed-9',
    type: 'task',
    title: 'PONT: s/ info Fira Barcelona',
    companyName: 'Pont Assegurances',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'purple',
    date: getWeekDayDate(2),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(2),
  },

  // Jueves (Día 3)
  {
    id: 'tf-seed-thu-1',
    type: 'task',
    title: 'PONT: s/ lotes navidad márgenes + info catàleg digital',
    companyName: 'Pont Assegurances',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(3),
    estimatedHours: 1.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-2',
    type: 'task',
    title: 'SPLENDID: fotos & videos para rrss noviembre',
    companyName: 'Splendid Events',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'purple',
    date: getWeekDayDate(3),
    estimatedHours: 3,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Equipo Audiovisual'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-3',
    type: 'meeting',
    title: 'EL SET 13:00 a 15:30: sesión de fotos + lona fachada',
    companyName: 'El Set Produccions',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(3),
    startTime: '13:00',
    endTime: '15:30',
    location: 'Estudio Fotográfico',
    createdBy: 'Equipo Audiovisual',
    isShared: true,
    assignees: ['Alejandro Ramos', 'Equipo Audiovisual'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-4',
    type: 'task',
    title: 'AORTAHUB: contenido del mes',
    companyName: 'Aorta Hub',
    status: 'todo',
    priority: 'media',
    colorStrip: 'blue',
    date: getWeekDayDate(3),
    estimatedHours: 2,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-5',
    type: 'task',
    title: 'ART NOV: kine3 (slack)',
    companyName: 'Art Noveau',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'yellow',
    date: getWeekDayDate(3),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-6',
    type: 'task',
    title: 'ALEHUBB: dossier para inversores + inmobiliaria',
    companyName: 'Alehubb Inversiones',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'mint',
    date: getWeekDayDate(3),
    estimatedHours: 3,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-7',
    type: 'task',
    title: 'GENESCA: comprar cat, cast, com + email',
    companyName: 'Genesca Pastissers',
    status: 'todo',
    priority: 'media',
    colorStrip: 'mint',
    date: getWeekDayDate(3),
    estimatedHours: 1.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-8',
    type: 'task',
    title: 'PONT: logo per reunió',
    companyName: 'Pont Assegurances',
    status: 'todo',
    priority: 'media',
    colorStrip: 'yellow',
    date: getWeekDayDate(3),
    estimatedHours: 1,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Diseño BUG'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-9',
    type: 'task',
    title: 'KURDOI: influencers decisiones de pago para mini calendario de...',
    companyName: 'Kurdoi Marca',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'yellow',
    date: getWeekDayDate(3),
    estimatedHours: 2,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },
  {
    id: 'tf-seed-thu-10',
    type: 'task',
    title: 'CLAUDIA: firma contrato',
    companyName: 'Claudia Legal',
    status: 'todo',
    priority: 'media',
    colorStrip: 'mint',
    date: getWeekDayDate(3),
    estimatedHours: 0.5,
    createdBy: 'Coordinación Brain Up',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(3),
  },

  // Viernes (Día 4 - Hoy)
  {
    id: 'tf-seed-fri-1',
    type: 'meeting',
    title: 'SILVIA (ONLINE)',
    companyName: 'Silvia Consulting',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'pink',
    date: getWeekDayDate(4),
    startTime: '09:30',
    endTime: '10:30',
    location: 'Google Meet',
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-2',
    type: 'task',
    title: 'GLOBAL: creatividades noviembre',
    companyName: 'Global Soluciones',
    status: 'todo',
    priority: 'media',
    colorStrip: 'orange',
    date: getWeekDayDate(4),
    estimatedHours: 3,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Equipo Creativo'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-3',
    type: 'task',
    title: 'SDT BUSCAR FECHA: presupuesto manu + ALEHUBB',
    companyName: 'SDT Soluciones',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'mint',
    date: getWeekDayDate(4),
    estimatedHours: 1.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-4',
    type: 'task',
    title: 'BAC: informar a cliente de la traducción de la web al catalán',
    companyName: 'BAC Asesores',
    status: 'todo',
    priority: 'media',
    colorStrip: 'blue',
    date: getWeekDayDate(4),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-5',
    type: 'task',
    title: 'SPLENDID: propuesta wedding planner nadal',
    companyName: 'Splendid Events',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(4),
    estimatedHours: 2,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-6',
    type: 'task',
    title: 'ALPHA: s/f Reportage fotogràfic suports Alpha Media Group',
    companyName: 'Alpha Media Group',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(4),
    estimatedHours: 2.5,
    createdBy: 'Equipo Audiovisual',
    isShared: true,
    assignees: ['Equipo Audiovisual'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-7',
    type: 'task',
    title: 'GENESCA: s/f formularios + citar',
    companyName: 'Genesca Pastissers',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(4),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-8',
    type: 'task',
    title: 'AONCHIP + SPLENDID: s/f cambios web per iniciar anglès',
    companyName: 'Aonchip Tech',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'gray',
    date: getWeekDayDate(4),
    estimatedHours: 2,
    createdBy: 'Desarrollo Web',
    isShared: true,
    assignees: ['Desarrollo Web'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-9',
    type: 'task',
    title: 'GLOVO: han dit algo?',
    companyName: 'Glovo Partner',
    status: 'todo',
    priority: 'alta',
    colorStrip: 'yellow',
    date: getWeekDayDate(4),
    estimatedHours: 0.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-10',
    type: 'task',
    title: 'VERITY: s/f rrss oct',
    companyName: 'Verity Brands',
    status: 'todo',
    priority: 'media',
    colorStrip: 'purple',
    date: getWeekDayDate(4),
    estimatedHours: 1.5,
    createdBy: 'Equipo Creativo',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },
  {
    id: 'tf-seed-fri-11',
    type: 'task',
    title: 'MAS BONVILAR: descargar catálogo apartado',
    companyName: 'Mas Bonvilar',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'gray',
    date: getWeekDayDate(4),
    estimatedHours: 1,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(4),
  },

  // Sábado (Día 5)
  {
    id: 'tf-seed-sat-1',
    type: 'task',
    title: 'BANCORA',
    companyName: 'Bancora Studio',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'gray',
    date: getWeekDayDate(5),
    estimatedHours: 2,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(5),
  },
  {
    id: 'tf-seed-sat-2',
    type: 'task',
    title: 'DANIEL TAPICERO',
    companyName: 'Daniel Tapicería',
    status: 'todo',
    priority: 'media',
    colorStrip: 'mint',
    date: getWeekDayDate(5),
    estimatedHours: 1.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(5),
  },
  {
    id: 'tf-seed-sat-3',
    type: 'task',
    title: 'EL7: cuándo',
    companyName: 'EL7 Menús',
    status: 'todo',
    priority: 'baja',
    colorStrip: 'gray',
    date: getWeekDayDate(5),
    estimatedHours: 0.5,
    createdBy: 'Equipo BUG',
    isShared: true,
    assignees: ['Alejandro Ramos'],
    createdAt: getWeekDayDate(5),
  },
];

function TaskFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolParam = searchParams.get('tool') || 'taskflow';
  const { user, isLoading: authLoading } = useAuth();
  
  // Timer Context para integración directa con Clockify
  const { 
    isTimerRunning, 
    timerSeconds, 
    activeCompany, 
    activeDescription, 
    startTimerWithEntry,
    stopTimer 
  } = useTimer();

  // Estados principales de TaskFlow
  const [items, setItems] = useState<TaskFlowItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Hook central de notificaciones interconectadas
  const { syncPostItReminders } = useNotifications();

  // Modos de visualización: Calendario L-V, Mural de Post-its y Lista
  const [viewMode, setViewMode] = useState<'calendar' | 'postits' | 'list'>('calendar');

  // Estado de Post-its / Recordatorios
  const [postIts, setPostIts] = useState<PostItItem[]>([]);

  // Sincronizar tab desde URL si aplica
  useEffect(() => {
    if (searchParams.get('tab') === 'postits') {
      setViewMode('postits');
    }
  }, [searchParams]);

  // Filtros (Prioridad eliminada por requerimiento)
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'shared' | 'meetings'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');

  // Listas de tareas con colores asignados
  const [taskLists, setTaskLists] = useState<TaskList[]>(DEFAULT_TASK_LISTS);

  // Modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskFlowItem | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(getTodayString());

  // Notificación Toast interactiva
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'alert' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'alert' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Redirigir a login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Cargar listas de tareas personalizadas
  useEffect(() => {
    try {
      const storedLists = localStorage.getItem('bug_taskflow_lists_v1');
      if (storedLists) {
        setTaskLists(JSON.parse(storedLists));
      } else {
        localStorage.setItem('bug_taskflow_lists_v1', JSON.stringify(DEFAULT_TASK_LISTS));
      }
    } catch {}
  }, []);

  const handleCreateList = (newList: TaskList) => {
    setTaskLists((prev) => {
      const updated = [...prev, newList];
      try {
        localStorage.setItem('bug_taskflow_lists_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Lista "${newList.name}" creada con éxito`, 'success');
  };

  // Cargar elementos desde localStorage o seed + Rutina de auto-desplazamiento
  useEffect(() => {
    try {
      const today = getTodayString();
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS_V2);
      if (stored) {
        const parsed = JSON.parse(stored);
        let currentItems: TaskFlowItem[] = [];
        if (Array.isArray(parsed) && parsed.length < 10) {
          currentItems = SEED_TASKFLOW_ITEMS;
        } else {
          currentItems = parsed;
        }

        // Auto-desplazamiento: si una tarea tiene autoReschedule activado y su fecha es anterior a hoy, se desplaza automáticamente a hoy
        let autoRolloverCount = 0;
        const rolledItems = currentItems.map((it) => {
          if (it.status !== 'done' && it.autoReschedule && it.date < today) {
            autoRolloverCount++;
            return {
              ...it,
              date: today,
            };
          }
          return it;
        });

        setItems(rolledItems);
        localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(rolledItems));

        if (autoRolloverCount > 0) {
          setTimeout(() => {
            showToast(`Se han desplazado ${autoRolloverCount} tareas pendientes automáticamente al día de hoy como recordatorio activo`, 'info');
          }, 1200);
        }
      } else {
        setItems(SEED_TASKFLOW_ITEMS);
        localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(SEED_TASKFLOW_ITEMS));
      }
    } catch (e) {
      console.warn('Error loading TaskFlow items:', e);
      setItems(SEED_TASKFLOW_ITEMS);
    }
  }, []);

  // Guardar elementos en localStorage
  const saveItems = (updated: TaskFlowItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS_V2, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving TaskFlow items:', e);
    }
  };

  // Reprogramación manual instantánea de todas las tareas vencidas a hoy (+1 día)
  const handleRescheduleOverdue = () => {
    const today = getTodayString();
    let count = 0;
    const updated = items.map((it) => {
      if (it.status !== 'done' && it.date < today) {
        count++;
        return {
          ...it,
          date: today,
        };
      }
      return it;
    });

    if (count > 0) {
      saveItems(updated);
      showToast(`Se han desplazado ${count} tareas pendientes al día de hoy para que sigas teniéndolas activas`, 'success');
    } else {
      showToast('No hay tareas pendientes vencidas para desplazar', 'info');
    }
  };

  // Desplazamiento manual en cualquier momento del día (al siguiente día hábil, saltando sábados y domingos)
  const handleQuickReschedule = (itemId: string, daysToAdd: number = 1) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const baseDate = new Date(item.date || getTodayString());
    let added = 0;
    while (added < daysToAdd) {
      baseDate.setDate(baseDate.getDate() + 1);
      const day = baseDate.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    const nextDateStr = baseDate.toISOString().split('T')[0];

    const updated = items.map((i) => (i.id === itemId ? { ...i, date: nextDateStr } : i));
    saveItems(updated);
    showToast(`"${item.title}" desplazada al ${nextDateStr} (siguiente día hábil)`, 'success');
  };

  // Cargar post-its desde localStorage o seed y sincronizar recordatorios
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTITS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPostIts(parsed);
          syncPostItReminders(parsed);
        } else {
          setPostIts(SEED_POST_ITS);
          localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(SEED_POST_ITS));
          syncPostItReminders(SEED_POST_ITS);
        }
      } else {
        setPostIts(SEED_POST_ITS);
        localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(SEED_POST_ITS));
        syncPostItReminders(SEED_POST_ITS);
      }
    } catch {
      setPostIts(SEED_POST_ITS);
      syncPostItReminders(SEED_POST_ITS);
    }
  }, [syncPostItReminders]);

  // Guardar post-its y disparar sincronización de alertas para el panel de notificaciones
  const savePostIts = (updated: PostItItem[]) => {
    setPostIts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_POSTITS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    syncPostItReminders(updated);
  };

  // Cargar empresas desde caché o base de datos
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const cachedComp = localStorage.getItem('bug_clockify_cache_companies');
        if (cachedComp) {
          setCompanies(JSON.parse(cachedComp));
          return;
        }
        const supabase = createClient();
        const { data } = await supabase.from('companies').select('*').order('name');
        if (data && data.length > 0) {
          setCompanies(data);
          localStorage.setItem('bug_clockify_cache_companies', JSON.stringify(data));
        } else {
          setCompanies(MOCK_COMPANIES);
        }
      } catch {
        setCompanies(MOCK_COMPANIES);
      }
    };
    loadCompanies();
  }, []);

  // Cargar perfiles de equipo para la colaboración
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const cachedProf = localStorage.getItem('bug_clockify_cache_profiles');
        if (cachedProf) {
          setProfiles(JSON.parse(cachedProf));
          return;
        }
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('*').order('full_name');
        if (data && data.length > 0) {
          setProfiles(data);
          localStorage.setItem('bug_clockify_cache_profiles', JSON.stringify(data));
        } else {
          setProfiles(MOCK_PROFILES);
        }
      } catch {
        setProfiles(MOCK_PROFILES);
      }
    };
    loadProfiles();
  }, []);

  // Manejar creación / guardado de elemento
  const handleSaveItem = (itemToSave: TaskFlowItem) => {
    const exists = items.some((i) => i.id === itemToSave.id);
    let updated: TaskFlowItem[];
    if (exists) {
      updated = items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
      showToast(`Elemento "${itemToSave.title}" actualizado con éxito.`, 'success');
    } else {
      updated = [itemToSave, ...items];
      showToast(
        `${itemToSave.type === 'meeting' ? 'Reunión' : 'Tarea'} "${itemToSave.title}" programada en el calendario.`,
        'success'
      );
    }
    saveItems(updated);
  };

  // Cambiar estado de elemento
  const handleChangeStatus = (itemId: string, nextStatus: TaskStatus) => {
    const item = items.find((i) => i.id === itemId);
    const updated = items.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i));
    saveItems(updated);
    if (item) {
      const statusLabels: Record<TaskStatus, string> = {
        todo: 'Por hacer',
        in_progress: 'En proceso',
        review: 'En revisión',
        done: 'Completada / Bien hecho',
      };
      showToast(`"${item.title}" movida a: ${statusLabels[nextStatus]}`, nextStatus === 'done' ? 'success' : 'info');
    }
  };

  // Mover elemento de fecha mediante Drag & Drop (arrastrar y soltar entre días)
  const handleMoveItemDate = (itemId: string, newDate: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.date === newDate) return;

    const updated = items.map((i) => (i.id === itemId ? { ...i, date: newDate } : i));
    saveItems(updated);

    try {
      const parts = newDate.split('-');
      const dayNum = parseInt(parts[2], 10);
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthStr = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      showToast(`"${item.title}" movida al ${dayNum} de ${monthStr}`, 'success');
    } catch {
      showToast(`"${item.title}" movida al ${newDate}`, 'success');
    }
  };

  // Eliminar elemento
  const handleDeleteItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!confirm(`¿Eliminar "${item?.title || 'este elemento'}" de TaskFlow?`)) return;
    const updated = items.filter((i) => i.id !== itemId);
    saveItems(updated);
    showToast('Elemento eliminado del tablero y calendario.', 'info');
  };

  // Iniciar temporizador directo en Clockify
  const handleStartClockifyTimer = (item: TaskFlowItem) => {
    // Buscar la empresa en la lista
    let targetCompany = companies.find((c) => c.name.toLowerCase() === item.companyName.toLowerCase());
    
    // Si no existe pero tenemos companyId, buscar por ID
    if (!targetCompany && item.companyId) {
      targetCompany = companies.find((c) => c.id === item.companyId);
    }

    if (targetCompany) {
      startTimerWithEntry(targetCompany.id, item.title);
      showToast(
        `▶ Temporizador de Clockify iniciado para "${targetCompany.name}" (${item.title})`,
        'success'
      );
    } else {
      // Si la empresa es genérica o interna, usar la primera empresa disponible o avisar
      if (companies.length > 0) {
        startTimerWithEntry(companies[0].id, `[${item.companyName}] ${item.title}`);
        showToast(
          `▶ Temporizador iniciado en Clockify para "${companies[0].name}" con la tarea`,
          'success'
        );
      } else {
        showToast(
          `No se encontró la empresa "${item.companyName}" en Clockify. Crea la empresa primero en el panel.`,
          'alert'
        );
      }
    }
  };

  // Abrir modal para crear
  const handleOpenCreateModal = (defaultDate?: string) => {
    setEditingItem(null);
    setModalDefaultDate(defaultDate || getTodayString());
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (item: TaskFlowItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Formatear segundos del temporizador activo para la cabecera
  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Verificar si el usuario tiene permiso para esta herramienta
  const hasAccess = canUserAccessHubApp(user, toolParam);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
            Cargando Brain Up TaskFlow...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de Acceso Denegado si el coordinador restringió esta app
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#F8F6FC] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="p-4 rounded-full bg-amber-50 text-amber-700 border border-amber-300 w-16 h-16 mx-auto flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-[#292929]">
              HERRAMIENTA NO DISPONIBLE EN TU PERFIL
            </h1>
            <p className="text-sm text-[#4A4A4A] leading-relaxed">
              Tu cuenta de usuario no tiene asignado el permiso de acceso para <strong>{toolParam.toUpperCase()}</strong> en la configuración de la coordinadora.
            </p>
          </div>
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#8E0E75] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#700B5C] transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a mi HUB de Aplicaciones</span>
          </Link>
        </main>
      </div>
    );
  }

  // Filtrar elementos
  const currentUserName = user.full_name || 'Trabajador Brain Up';

  const filteredItems = items.filter((item) => {
    // Filtro por texto de búsqueda
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.assignees && item.assignees.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase())));

    // Filtro por ámbito / compartición
    let matchesScope = true;
    if (scopeFilter === 'mine') {
      matchesScope =
        item.createdBy === currentUserName ||
        (item.assignees && item.assignees.includes(currentUserName));
    } else if (scopeFilter === 'shared') {
      matchesScope = item.isShared === true;
    } else if (scopeFilter === 'meetings') {
      matchesScope = item.type === 'meeting';
    }

    // Filtro por cliente
    const matchesClient = clientFilter === 'all' || item.companyName === clientFilter;

    // Filtro por lista de tareas
    const matchesList = selectedListFilter === 'all' || item.listId === selectedListFilter;

    return matchesSearch && matchesScope && matchesClient && matchesList;
  });

  return (
    <div className="min-h-screen bg-[var(--hub-bg,#F8F6FC)] flex flex-col font-sans">
      <Navbar />

      {/* Notificación Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-[#8E0E75] p-3.5 rounded-sm shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-[#292929] leading-tight flex-1">
            {toastMessage.text}
          </p>
        </div>
      )}

      <main className="page-transition flex-1 w-full max-w-none px-3 sm:px-5 lg:px-6 py-2 flex flex-col space-y-2">
        
        {/* Barra de Herramientas Compacta: Conmutador de Vistas + Filtros de Ámbito y Prioridad (Sin duplicaciones) */}
        <div className="bg-white border border-[#D8CFF0] px-3 py-1.5 rounded-sm shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Conmutador de Vistas: Calendario (L-V), Mural de Post-its y Lista */}
          <div className="flex items-center rounded-sm bg-[#F8F6FC] p-0.5 border border-[#D8CFF0] text-[11px] font-extrabold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendario (L-V)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('postits')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                viewMode === 'postits'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span>Mural de Post-its</span>
              {postIts.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  viewMode === 'postits' ? 'bg-white/25 text-white' : 'bg-[#D8CFF0] text-[#8E0E75]'
                }`}>
                  {postIts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#8E0E75] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#292929]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Filtros de Ámbito */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A4A4A] mr-0.5 hidden md:inline">
              Ver:
            </span>
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-2 py-0.5 rounded-sm border transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                  : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className={`px-2 py-0.5 rounded-sm border transition-all cursor-pointer ${
                scopeFilter === 'mine'
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                  : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Mis Tareas
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('shared')}
              className={`px-2 py-0.5 rounded-sm border transition-all cursor-pointer ${
                scopeFilter === 'shared'
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                  : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Compartidas
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('meetings')}
              className={`px-2 py-0.5 rounded-sm border transition-all cursor-pointer ${
                scopeFilter === 'meetings'
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                  : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Reuniones ({items.filter(it => it.type === 'meeting').length})
            </button>
          </div>

          {/* Botón de Desplazar Pendientes Vencidas (Reemplaza filtro de prioridad) */}
          <button
            type="button"
            onClick={handleRescheduleOverdue}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#D8CFF0] hover:border-[#8E0E75] bg-[#F8F6FC] hover:bg-white text-[#8E0E75] text-[11px] font-bold transition-all cursor-pointer"
            title="Desplazar tareas pendientes vencidas a hoy como recordatorio activo"
          >
            <RotateCw className="h-3 w-3" />
            <span>Desplazar Vencidas a Hoy</span>
          </button>

          {/* Buscador Compacto */}
          <div className="relative w-full sm:w-48 lg:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4A4A4A]" />
            <input
              type="text"
              placeholder="Buscar tareas, clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 border border-[#D8CFF0] rounded-sm text-xs bg-[#F8F6FC] focus:bg-white focus:border-[#8E0E75] outline-none font-medium"
            />
          </div>

        </div>

        {/* Barra de Listas de Tareas con Colores Asignados */}
        <div className="bg-white border border-[#D8CFF0] px-3 py-1.5 rounded-sm shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4A4A4A] mr-1 hidden sm:inline flex items-center gap-1">
              <Layers className="h-3 w-3 text-[#8E0E75]" />
              <span>Listas:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedListFilter('all')}
              className={`px-2.5 py-1 rounded-sm border text-xs font-bold transition-all cursor-pointer ${
                selectedListFilter === 'all'
                  ? 'bg-[#8E0E75] text-white border-[#8E0E75] shadow-xs'
                  : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({items.length})
            </button>
            {taskLists.map((list) => {
              const count = items.filter(it => it.listId === list.id).length;
              const isSelected = selectedListFilter === list.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListFilter(list.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#8E0E75] text-[#8E0E75] shadow-xs ring-1 ring-[#8E0E75]'
                      : 'bg-[#F8F6FC] text-[#4A4A4A] border-slate-200 hover:bg-white'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  <span>{list.name}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Botón rápido para crear nueva lista de tareas */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[#D8CFF0] hover:border-[#8E0E75] text-[#8E0E75] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#F8F6FC] transition-all cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Nueva Lista</span>
          </button>
        </div>

        {/* Vista Renderizada: Calendario Nativo (L-V con panel de notificaciones), Mural de Post-its o Lista */}
        {viewMode === 'calendar' && (
          <NativeCalendar
            items={filteredItems}
            postIts={postIts}
            onOpenPostIt={() => setViewMode('postits')}
            onSelectItem={handleOpenEditModal}
            onDeleteItem={handleDeleteItem}
            onToggleStatus={handleChangeStatus}
            onStartClockifyTimer={handleStartClockifyTimer}
            onOpenCreateModal={handleOpenCreateModal}
            onRescheduleOverdue={handleRescheduleOverdue}
            onMoveItemDate={handleMoveItemDate}
            onQuickReschedule={handleQuickReschedule}
            currentUserName={currentUserName}
          />
        )}

        {viewMode === 'postits' && (
          <PostItBoard
            postIts={postIts}
            onSavePostIts={savePostIts}
          />
        )}

        {viewMode === 'list' && (
          <TaskListView
            items={filteredItems}
            onSelectItem={handleOpenEditModal}
            onDeleteItem={handleDeleteItem}
            onChangeStatus={handleChangeStatus}
            onStartClockifyTimer={handleStartClockifyTimer}
          />
        )}

      </main>

      {/* Modal Unificado de Creación y Edición */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        defaultDate={modalDefaultDate}
        companies={companies}
        profiles={profiles}
        currentUserName={currentUserName}
        taskLists={taskLists}
        onCreateList={handleCreateList}
      />
    </div>
  );
}

export default function TaskFlowAppPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8CFF0] border-t-[#8E0E75]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#292929]">
              Cargando Brain Up TaskFlow...
            </p>
          </div>
        </div>
      }
    >
      <TaskFlowContent />
    </Suspense>
  );
}

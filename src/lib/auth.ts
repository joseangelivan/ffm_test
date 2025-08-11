
'use server';

import { cookies } from 'next/headers';
import { verifySession, type SessionPayload } from '@/lib/session';

'use client';

/**
 * @purpose Gestiona el carga y estado de espacios y cursos para la ingestión del curso de espacio en la aplicación ABDQuiz.
 * @purpose_en Manages the loading and state of spaces and courses for space course ingestion in the ABDQuiz application.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1grux98
 * @lastUpdated 2026-06-23T17:42:09.062Z
 */

import { useState, useEffect } from 'react';
import { getActiveSpacesAction, getCoursesBySpaceAction } from '@/actions/hierarchyValidation';
import type { SpaceOption, CourseOption } from '../types';

export function useSpaceCourseLoader(currentSpaceId?: string, currentCourseId?: string) {
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [nullifyCourse, setNullifyCourse] = useState(false);
  const [remember, setRemember] = useState(false);
  const [applyDisabled, setApplyDisabled] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingSpaces(true);
      const result = await getActiveSpacesAction();
      if (result.success && result.data) {
        setSpaces(result.data);
        if (currentSpaceId) {
          const match = result.data.find((s) => s._id === currentSpaceId);
          if (match) setSelectedSpaceId(match._id);
        }
      }
      setLoadingSpaces(false);
    })();
  }, [currentSpaceId]);

  useEffect(() => {
    if (!selectedSpaceId) return;
    // No synchronous setState — data is fetched asynchronously
    getCoursesBySpaceAction(selectedSpaceId)
      .then((result) => {
        if (result.success && result.data) {
          setCourses(result.data);
          if (currentCourseId) {
            const match = result.data.find((c) => c._id === currentCourseId);
            if (match) setSelectedCourseId(match._id);
            else setSelectedCourseId('');
          }
        }
      })
      .catch(() => {/* Silently fail */});
  }, [selectedSpaceId, currentCourseId]);

  return {
    spaces, courses,
    loadingSpaces, loadingCourses,
    selectedSpaceId, setSelectedSpaceId,
    selectedCourseId, setSelectedCourseId,
    nullifyCourse, setNullifyCourse,
    remember, setRemember,
    applyDisabled, setApplyDisabled,
  };
}

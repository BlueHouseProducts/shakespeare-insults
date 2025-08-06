import { SectionList, Pressable, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Insults, InsultsVersion } from '~/Constants/Insults';
import { Container } from '~/components/Container';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

const FAV_STORAGE_KEY = 'userFavList';

const InsultCard = React.memo(function InsultCard({
  quote,
  from,
  index,
  isFav,
  onToggle,
}: {
  quote: string;
  from: string;
  index: number;
  isFav: boolean;
  onToggle: (idx: number) => void;
}) {
  return (
    <View
      className={`mb-3 rounded-xl shadow-md p-5 w-full max-w-xl ${
        isFav ? 'bg-[#C8EEF0]' : 'bg-white'
      }`}
    >
      <Text className="text-lg text-black">{quote}</Text>
      <Text className="text-sm text-gray-500">{from}</Text>
      <View className="flex-row-reverse mt-2">
        <Pressable
          onPress={() => onToggle(index)}
          className={`p-3 px-4 rounded-md shadow-md ${
            isFav ? 'bg-red-200' : 'bg-blue-200'
          } flex flex-row gap-2`}
        >
          <MaterialIcons
            name={isFav ? 'delete-outline' : 'star-outline'}
            size={20}
            color="black"
          />
          <Text>{isFav ? 'Remove' : ''} Favourite</Text>
        </Pressable>
      </View>
    </View>
  );
});

export default function AppAllInsultsHome() {
  const [favSet, setFavSet] = useState<Set<number>>(new Set());

  // Precompute index of each quote
  const insultIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    Insults.forEach((insult, idx) => map.set(insult.quote, idx));
    return map;
  }, []);

  // Group insults by play for SectionList
  const sections = useMemo(() => {
    const grouped = Insults.reduce((acc, insult) => {
      if (!acc[insult.play]) acc[insult.play] = [];
      acc[insult.play].push(insult);
      return acc;
    }, {} as Record<string, typeof Insults>);
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, []);

  // Load favorites from AsyncStorage
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadFavorites() {
        try {
          const raw = await AsyncStorage.getItem(FAV_STORAGE_KEY);
          const favs = raw ? raw.split(',').map(Number).filter(n => !isNaN(n)) : [];
          if (isActive) {
            setFavSet(new Set(favs));
          }
        } catch {
          if (isActive) {
            setFavSet(new Set());
          }
        }
      }

      loadFavorites();

      return () => {
        isActive = false; // cleanup in case effect finishes after unmount
      };
    }, [])
  );

  // Optimistic UI update
  const toggleFavorite = useCallback((idx: number) => {
    setFavSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      AsyncStorage.setItem(FAV_STORAGE_KEY, Array.from(newSet).join(',')).catch(err =>
        console.error('Failed to save favorites', err)
      );
      return newSet;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof Insults)[number] }) => {
      const insultIndex = insultIndexMap.get(item.quote) ?? -1;
      const isFav = insultIndex !== -1 && favSet.has(insultIndex);

      return (
        <InsultCard
          quote={item.quote}
          from={item.from}
          index={insultIndex}
          isFav={isFav}
          onToggle={toggleFavorite}
        />
      );
    },
    [favSet, insultIndexMap, toggleFavorite]
  );

  return (
    <>
      <Stack.Screen options={{ title: 'All Insults' }} />
      <Container>
        <View className="w-full h-fit px-4 mb-5">
          <Text className="text-3xl font-bold">All Insults</Text>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.quote}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-2xl font-bold mb-3 text-gray-800 px-4">{title}</Text>
          )}
          contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 16 }}
        />

        <Text className="mb-6 mt-4 text-center text-gray-500">
          Insults List Version {InsultsVersion}
        </Text>
      </Container>
    </>
  );
}

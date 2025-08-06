import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { Container } from "~/components/Container";
import { Insults } from "~/Constants/Insults";

const FAV_STORAGE_KEY = "userFavList";

async function getAllFavs(): Promise<Set<number>> {
  try {
    const favsRaw = await AsyncStorage.getItem(FAV_STORAGE_KEY);
    if (!favsRaw) return new Set();
    return new Set(favsRaw.split(",").map(Number).filter(n => !isNaN(n)));
  } catch {
    return new Set();
  }
}

async function removeFav(idx: number): Promise<Set<number>> {
  try {
    const favs = await getAllFavs();
    favs.delete(idx);
    await AsyncStorage.setItem(FAV_STORAGE_KEY, Array.from(favs).join(","));
    return favs;
  } catch {
    return new Set();
  }
}

export default function FavouritesPage() {
  const [favSet, setFavSet] = useState<Set<number> | null>(null);

  // Refresh favorites when page comes into focus
  useFocusEffect(
    useCallback(() => {
      getAllFavs().then(setFavSet);
    }, [])
  );

  const handleRemove = (idx: number) => {
    // Optimistically update the UI first
    setFavSet((prev) => {
      if (!prev) return prev;
      const updated = new Set(prev);
      updated.delete(idx);
      return new Set(updated);
    });

    // Then update AsyncStorage in the background
    removeFav(idx);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Favourites" }} />
      <Container>
        <ScrollView
          className="flex-1 p-4 w-full"
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "flex-start",
            paddingBottom: 60,
          }}
        >
          <Text className="text-3xl font-bold mb-4">My Favourites</Text>

          {favSet === null ? (
            <Text>Loading favourites...</Text>
          ) : favSet.size === 0 ? (
            <>
              <Text className="font-bold text-2xl text-gray-800">No favourites yet</Text>
              <Text className="text-lg text-center">
                Tap the star on an insult to add one.
              </Text>
            </>
          ) : (
            Array.from(favSet)
              .filter(idx => Insults[idx]) // prevent crashes from invalid indices
              .map((idx) => {
                const insult = Insults[idx];
                return (
                  <View
                    key={insult.quote + idx}
                    className="mb-3 bg-[#C8EEF0] rounded-xl shadow-md p-5 w-full max-w-xl"
                  >
                    <Text className="text-lg text-black">{insult.quote}</Text>
                    <Text className="text-sm text-gray-500">{insult.from}</Text>
                    <View className="flex-row-reverse mt-2">
                      <Pressable
                        onPress={() => handleRemove(idx)}
                        className="bg-red-200 p-3 px-4 rounded-md shadow-md"
                      >
                        <MaterialIcons name="delete-outline" size={20} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
          )}
        </ScrollView>
      </Container>
    </>
  );
}

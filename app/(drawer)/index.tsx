import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { Container } from '~/components/Container';

import { Pressable, Text, View } from 'react-native';
import { Insults } from '~/Constants/Insults';
import { memo, use, useEffect, useState } from 'react';

import { Alert } from 'react-native'

import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

export default function Home() {
  const [insultIndex, setInsultIndex] = useState(Math.floor(Math.random() * Insults.length));
  const [itemIsFav, setItemIsFav] = useState(false);
  const [favIndices, setFavIndices] = useState<number[]>([]);


  const opacity = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const bgColor = useDerivedValue(() =>
    interpolateColor(backgroundColor.value, [0, 1], ['#ffffff', '#C8EEF0'])
  );

  function changeInsult() {
    opacity.value = withTiming(
      0,
      {
        duration: 100,
        easing: Easing.out(Easing.quad),
      },
      (isFinished) => {
        if (isFinished) {
          runOnJS(setInsultIndex)(Math.floor(Math.random() * Insults.length));
          opacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.in(Easing.quad),
          });
        }
      }
    );
  };

  function changeInsultFav() {
  runOnJS(loadRandomFavoriteInsultForAnimation)();
}

  // New helper function to handle the logic and animation
  async function loadRandomFavoriteInsultForAnimation() {
    const favsRaw = await AsyncStorage.getItem("userFavList");
    const favIndices = favsRaw
      ? favsRaw
          .split(",")
          .map(Number)
          .filter(idx => !isNaN(idx) && idx >= 0 && idx < Insults.length)
      : [];

    if (favIndices.length === 0) {
      Alert.alert("No Favourites", "You have no favourites! Tap the star on an insult to add one.");
      return;
    }

    const randomIndex = favIndices[Math.floor(Math.random() * favIndices.length)];

    // Animate transition
    opacity.value = withTiming(
      0,
      {
        duration: 100,
        easing: Easing.out(Easing.quad),
      },
      (isFinished) => {
        if (isFinished) {
          runOnJS(setInsultIndex)(randomIndex);
          opacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.in(Easing.quad),
          });
        }
      }
    );
  }

  async function SetNewFav(idx: number) {
    try {
      const currentFavsRaw = await AsyncStorage.getItem("userFavList");
      let favsSet: string[] = currentFavsRaw ? currentFavsRaw.split(",") : [];

      if (!favsSet.includes(idx.toString())) {
        favsSet.push(idx.toString());
      }

      await AsyncStorage.setItem("userFavList", favsSet.join(","));
      return true;
    } catch {
      return false;
    }
  }

  async function RemoveFav(idx: number) {
    try {
      const currentFavsRaw = await AsyncStorage.getItem("userFavList");
      if (!currentFavsRaw) return false;

      const favsSet = currentFavsRaw.split(",").filter(i => i !== idx.toString());

      await AsyncStorage.setItem("userFavList", favsSet.join(","));
      return true;
    } catch {
      return false;
    }
  }

  async function IsItemFav(idx: number) {
    try {
      const favs = await AsyncStorage.getItem("userFavList");

      if (favs && favs.split(",").includes(idx.toString())) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async function toggleFavorite(idx: number) {
    const isFav = favIndices.includes(idx);
    let updatedFavs: number[];

    if (isFav) {
      // remove from favorites
      updatedFavs = favIndices.filter(i => i !== idx);
    } else {
      // add to favorites
      updatedFavs = [...favIndices, idx];
    }

    // Update local state
    setFavIndices(updatedFavs);

    // Persist to AsyncStorage
    await AsyncStorage.setItem("userFavList", updatedFavs.join(","));

    // Animate background color
    backgroundColor.value = withTiming(isFav ? 0 : 1, {
      duration: 200,
      easing: Easing.inOut(Easing.quad),
    });
  }



  async function getRandomFavoriteInsult(): Promise<typeof Insults[0]> {
    try {
      const favsRaw = await AsyncStorage.getItem("userFavList");

      const favIndices = favsRaw
        ? favsRaw
            .split(",")
            .map(Number)
            .filter(idx => !isNaN(idx) && idx >= 0 && idx < Insults.length)
        : [];

      if (favIndices.length === 0) {
        return {
          quote: "Tap the star on an insult to add a favourite.",
          from: "You have no favourites! ",
          play: "Favourites",
        };
      }

      const randomIndex = favIndices[Math.floor(Math.random() * favIndices.length)];
      return Insults[randomIndex];
    } catch (error) {
      console.error("Error fetching random favorite insult:", error);
      return {
        quote: "Tap the star on an insult to add a favourite.",
        from: "You have no favourites! ",
        play: "Favourites",
      };
    }
  }

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      backgroundColor: bgColor.value,
    };
  });

  const currentInsult = Insults[insultIndex];

  useFocusEffect(
    React.useCallback(() => {
      const loadFavs = async () => {
        const favsRaw = await AsyncStorage.getItem("userFavList");
        const indices = favsRaw
          ? favsRaw
              .split(",")
              .map(Number)
              .filter(n => !isNaN(n) && n >= 0 && n < Insults.length)
          : [];

        setFavIndices(indices);
      };

      loadFavs();
    }, [])
  );

  // Update favorite status and background when insultIndex or favIndices change
  useEffect(() => {
    const isFav = favIndices.includes(insultIndex);
    setItemIsFav(isFav);

    backgroundColor.value = withTiming(isFav ? 1 : 0, {
      duration: 200,
      easing: Easing.inOut(Easing.quad),
    });
  }, [insultIndex, favIndices]);

  //const InsultCard = memo(({ insult, isFav, animatedStyle, onToggleFav }: any) => (
  //  
  //));

  const MemoTip = React.memo(() => <Text>(tap insult to favourite)</Text>, () => true);

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container>
        <View className="flex-1 items-center justify-start p-4 w-full">
          <Text className="text-2xl font-semibold text-center mb-6 text-gray-800">
            Your <Text className="font-extrabold text-blue-700">Shakespeare</Text> insult
          </Text>

          <Animated.View style={animatedCardStyle} className="bg-white rounded-xl shadow-md w-full max-w-xl mb-6">
            <Pressable className='p-5' onPress={() => toggleFavorite(insultIndex)}>
              <Text className="text-xl text-gray-900 mb-2">{`"${currentInsult.quote}"`}</Text>
              <View className='flex flex-row justify-between'>
                <Text className="flex-1 text-base text-gray-600">{`— ${currentInsult.from}, ${currentInsult.play}`}</Text>
                <MaterialIcons className='shrink-0 ml-3' name={itemIsFav ? 'star' : 'star-outline'} size={20} />
              </View>
            </Pressable>
          </Animated.View>

          <MemoTip />
          
            
          <View className='absolute bottom-0 flex items-center'>

             <Pressable
              onPress={changeInsult}
              className="bg-white px-6 py-5 rounded-full flex flex-row items-center shadow-lg active:opacity-80 w-full border-black border-2"
            >
              <MaterialIcons name='refresh' size={25} className='mx-2' />
              <Text className="text-black text-lg font-medium text-center lg:w-full">Show Insult</Text>
            </Pressable>

            <Pressable
              className="bg-[#C8EEF0] text-black mt-5 px-6 py-5 rounded-full flex flex-row items-center shadow-lg active:opacity-80 border-black border-2 w-full text-center"
              onPress={changeInsultFav}
            >
              <MaterialIcons name='star-outline' className='mx-2' size={25} />
              <Text className="text-gray-800 text-lg font-medium text-center lg:w-full">Show Favourite</Text>
            </Pressable>

          </View>
        </View>
      </Container>
    </>
  );
}

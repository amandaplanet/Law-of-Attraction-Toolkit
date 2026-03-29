import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CreateEntryScreen from '../screens/CreateEntryScreen';
import BookScreen from '../screens/BookScreen';
import MeditationScreen from '../screens/MeditationScreen';
import FocusWheelScreen from '../screens/FocusWheelScreen';
import FocusWheelArchiveScreen from '../screens/FocusWheelArchiveScreen';
import EmotionalGuidanceScaleScreen from '../screens/EmotionalGuidanceScaleScreen';
import SixtyEightSecondScreen from '../screens/SixtyEightSecondScreen';
import CreativeWorkshopScreen from '../screens/CreativeWorkshopScreen';
import CreativeWorkshopTopicScreen from '../screens/CreativeWorkshopTopicScreen';
import CreativeWorkshopItemScreen from '../screens/CreativeWorkshopItemScreen';
import CreativeWorkshopWantScreen from '../screens/CreativeWorkshopWantScreen';
import CreativeWorkshopArchiveScreen from '../screens/CreativeWorkshopArchiveScreen';
import PlacematScreen from '../screens/PlacematScreen';
import PlacematArchiveScreen from '../screens/PlacematArchiveScreen';
import { Entry } from '../types';

export type RootStackParamList = {
  Home: undefined;
  Book: { jumpToId?: string } | undefined;
  CreateEntry: { entry?: Entry } | undefined;
  Meditation: undefined;
  FocusWheel: undefined;
  FocusWheelArchive: undefined;
  EmotionalGuidanceScale: undefined;
  SixtyEightSecond: undefined;
  CreativeWorkshop: undefined;
  CreativeWorkshopTopic: { topic: string; label: string; emoji: string; color: string };
  CreativeWorkshopItem: { topic: string; label: string; emoji: string; color: string; itemId?: string };
  CreativeWorkshopWant: { topic: string; label: string; emoji: string; color: string; itemId: string };
  CreativeWorkshopArchive: undefined;
  Placemat: undefined;
  PlacematArchive: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Book" component={BookScreen} />
        <Stack.Screen name="CreateEntry" component={CreateEntryScreen} />
        <Stack.Screen name="Meditation" component={MeditationScreen} />
        <Stack.Screen name="FocusWheel" component={FocusWheelScreen} />
        <Stack.Screen name="FocusWheelArchive" component={FocusWheelArchiveScreen} />
        <Stack.Screen name="EmotionalGuidanceScale" component={EmotionalGuidanceScaleScreen} />
        <Stack.Screen name="SixtyEightSecond" component={SixtyEightSecondScreen} />
        <Stack.Screen name="CreativeWorkshop" component={CreativeWorkshopScreen} />
        <Stack.Screen name="CreativeWorkshopTopic" component={CreativeWorkshopTopicScreen} />
        <Stack.Screen name="CreativeWorkshopItem" component={CreativeWorkshopItemScreen} />
        <Stack.Screen name="CreativeWorkshopWant" component={CreativeWorkshopWantScreen} />
        <Stack.Screen name="CreativeWorkshopArchive" component={CreativeWorkshopArchiveScreen} />
        <Stack.Screen name="Placemat" component={PlacematScreen} />
        <Stack.Screen name="PlacematArchive" component={PlacematArchiveScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

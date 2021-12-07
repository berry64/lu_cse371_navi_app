import React, { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Provider as PaperProvider, IconButton, Colors, Button, FAB, Portal } from 'react-native-paper';
import { Alert, AppRegistry } from 'react-native';
import { WebView } from 'react-native-webview';
import Storage from './pages/storage';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import ctx from './global';

const range = 1;

function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}

export default function App() {
    const webview = useRef();
    const [showModal, setShowModal] = React.useState(false);
    const [modalContent, setModalContent] = React.useState(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [settings, setSettings] = React.useState(true);
    const [lastPlay, setLastPlay] = React.useState(null);
    const [markers, setMarkers] = React.useState([]);
    let selected = '', filters = [];

    useEffect(() => {
        if(!selected)
            Alert.alert('Error', 'No selected data, select a location in settings first.');
        else {
            FileSystem.readAsStringAsync(FileSystem.documentDirectory + 'data.json').then(data => {
                let json = JSON.parse(data);
                setMarkers(json);
            });
        }

        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: true,
        });
        
        Location.requestForegroundPermissionsAsync();
        //Location.requestBackgroundPermissionsAsync();
        Location.watchPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 40
        }, (location) => {
            if (!isPlaying) {
                for (let i = 0; i < markers.length; i++) {
                    if (calcCrow(location.coords.latitude, location.coords.longitude, markers[i].latitude, markers[i].longitude) <= range) {
                        let res = markers[i];
                        setModalContent(res.desc);
                        if (filter.includes(res.category) && lastPlay && lastPlay.name != res.name) {
                            async function playSound() {
                                const soundObject = new Audio.Sound();
                                try {
                                    setIsPlaying(true);
                                    setLastPlay(res.name);
                                    let { exists, uri } = await FileSystem.getInfoAsync(FileSystem.documentDirectory + res.sound);
                                    if(exists) {
                                        await soundObject.loadAsync({ uri }, { shouldPlay: true });
                                        await soundObject.playAsync();
                                        soundObject.setOnPlaybackStatusUpdate(status => {
                                            if (status.didJustFinish) {
                                                soundObject.unloadAsync();
                                                setIsPlaying(false);
                                            }
                                        });
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                            playSound();
                        }
                        break;
                    }
                }
            }
        });
    }, []);

    return (
        <PaperProvider>
            <StatusBar style="dark" />
            <ctx.Provider value={{
                selected, filters,
                setSelected: s => selected = s,
                setFilters: s => filters = s,
            }}>
                <Portal.Host />
            <View>
                <MapView style={style.map} showsUserLocation={true} followsUserLocation={true}>
                    {markers.map((marker, index) => (
                        <MapView.Marker
                            key={index}
                            coordinate={{
                                latitude: marker.latitude,
                                longitude: marker.longitude
                            }}
                            title={marker.name}
                            description={marker.desc}
                        />
                    ))}
                </MapView>
                {showModal ? <View style={style.modalbg}>
                    {settings ? <Storage />
                    :<View style={style.modal}>
                        <WebView ref={(ref) => (webview = ref)} originWhitelist="[*]" source={modalContent.startsWith("http://")?modalContent : { html: modalContent}} onNavigationStateChange={(event) => {
                            if(event.url !== "about:blank") {
                                webview.stopLoading();
                                Linking.openURL(event.url);
                            }
                        }}/>
                    </View>}
                    <IconButton style={style.close} color={Colors.red500} icon="close" onPress={() => {if(settings) setSettings(false); setShowModal(false)}} />
                </View> :<>
                    <Button style={style.open} mode="contained" disabled={!modalContent} onPress={() => setShowModal(true)} >{modalContent ? "Open description" : "Walk closer to a PoI"}</Button>
                    <FAB
                        small={true}
                        style = {style.fab}
                        icon = "cog"
                        onPress = {() => { setSettings(true); setShowModal(true);}}
                    />
                </>}
            </View>
            </ctx.Provider>
        </PaperProvider>
    );
}

AppRegistry.registerComponent('App', () => App);

const style = StyleSheet.create({
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    modalbg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
    },
    modal: {
        width: '80%',
        height: '80%',
        marginHorizontal: 'auto',
        backgroundColor: 'white',
        borderRadius: 50,
    },
    fab : {
        position: 'absolute',
        top: 40,
        left: 0,
        margin: 20,
    },
    close: {
        position: 'absolute',
        bottom: 60,
        width: 50,
        height: 50,
        borderRadius: 50,
    },
    open: {
        width: '80%',
        position: 'absolute',
        bottom: 60,
        left: '10%',
        right: '10%',
        borderRadius: 50,
    }
});

# Add project specific ProGuard rules here.
# For more details, see http://developer.android.com/guide/developing/tools/proguard.html

# -------------------------
# React Native core rules
# -------------------------
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Keep JS interface annotations
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep ReactPackage implementations
-keep class * implements com.facebook.react.ReactPackage { *; }

# -------------------------
# React Native Reanimated
# -------------------------
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# -------------------------
# TurboModules
# -------------------------
-keep class com.facebook.react.turbomodule.** { *; }

# -------------------------
# Kotlin
# -------------------------
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.Metadata { *; }
-dontwarn kotlin.**

# -------------------------
# OkHttp / Networking
# -------------------------
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# -------------------------
# JSR 305 annotations
# -------------------------
-dontwarn javax.annotation.**

# -------------------------
# Keep native methods
# -------------------------
-keepclassmembers class * {
    native <methods>;
}

# -------------------------
# Keep Parcelables
# -------------------------
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# -------------------------
# Keep Serializable classes
# -------------------------
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# -------------------------
# Expo modules
# -------------------------
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# -------------------------
# App-specific keep rules
# -------------------------
# Add any project specific keep options here:

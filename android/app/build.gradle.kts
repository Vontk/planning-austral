plugins { id("com.android.application") }
android {
    namespace = "io.github.vontk.campuslookup"
    compileSdk = 35
    defaultConfig {
        applicationId = "io.github.vontk.campuslookup"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    lint { abortOnError = true; checkReleaseBuilds = true }
}
dependencies { testImplementation("junit:junit:4.13.2") }
